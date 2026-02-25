package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"

	"github.com/firewall-manager/backend/internal/api/handlers"
	"github.com/firewall-manager/backend/internal/api/middleware"
	"github.com/firewall-manager/backend/internal/firewall"
	"github.com/firewall-manager/backend/internal/repository"
	"github.com/firewall-manager/backend/internal/service"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
)

func main() {
	log := logrus.New()
	log.SetFormatter(&logrus.JSONFormatter{})
	log.SetOutput(os.Stdout)

	cfg := loadConfig()

	if cfg.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
		log.SetLevel(logrus.InfoLevel)
	} else {
		log.SetLevel(logrus.DebugLevel)
	}

	db, err := repository.NewSQLiteDB(cfg.DBPath)
	if err != nil {
		log.WithError(err).Fatal("failed to open database")
	}
	defer db.Close()

	if err := repository.Migrate(db); err != nil {
		log.WithError(err).Fatal("failed to run migrations")
	}

	ruleRepo := repository.NewRuleRepository(db)
	historyRepo := repository.NewHistoryRepository(db)

	driver := firewall.NewIptablesDriver(log)

	fwService := service.NewFirewallService(ruleRepo, historyRepo, driver, log)

	ruleHandler := handlers.NewRuleHandler(fwService, log)
	firewallHandler := handlers.NewFirewallHandler(fwService, log)

	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(middleware.RequestLogger(log))
	router.Use(cors.New(cors.Config{
		AllowOrigins:     cfg.AllowedOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// Public health endpoint (no auth) so UI and load-checkers can probe status.
	router.GET("/api/health", handlers.HealthHandler)

	api := router.Group("/api")
	api.Use(middleware.Auth(cfg.APIKey))
	{
		rules := api.Group("/rules")
		{
			rules.GET("", ruleHandler.List)
			rules.POST("", ruleHandler.Create)
			rules.PUT("/:id", ruleHandler.Update)
			rules.DELETE("/:id", ruleHandler.Delete)
		}

		api.POST("/apply", firewallHandler.Apply)
		api.POST("/rollback", firewallHandler.Rollback)
		api.GET("/counters", firewallHandler.Counters)
	}

	// If a built frontend exists, serve it from / so visiting the server shows the UI.
	// This is helpful for single-host deployments or testing a built frontend.
	if fi, err := os.Stat(cfg.FrontendPath); err == nil && fi.IsDir() {
		log.WithField("path", cfg.FrontendPath).Info("serving built frontend from dist")
		// Serve static files via NoRoute to avoid wildcard conflict with /api
		router.NoRoute(func(c *gin.Context) {
			path := c.Request.URL.Path
			file := filepath.Join(cfg.FrontendPath, path)
			if info, err := os.Stat(file); err == nil && !info.IsDir() {
				c.File(file)
				return
			}
			c.File(filepath.Join(cfg.FrontendPath, "index.html"))
		})
	}

	srv := &http.Server{
		Addr:         fmt.Sprintf(":%s", cfg.Port),
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.WithField("port", cfg.Port).Info("server starting")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.WithError(err).Fatal("server failed")
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info("shutting down server...")
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.WithError(err).Fatal("server forced shutdown")
	}
	log.Info("server exited")
}
