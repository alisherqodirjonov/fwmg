package handlers

import (
	"net/http"

	"github.com/firewall-manager/backend/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
)

type FirewallHandler struct {
	svc service.FirewallService
	log *logrus.Logger
}

func NewFirewallHandler(svc service.FirewallService, log *logrus.Logger) *FirewallHandler {
	return &FirewallHandler{svc: svc, log: log}
}

func (h *FirewallHandler) Apply(c *gin.Context) {
	if err := h.svc.ApplyRules(c.Request.Context()); err != nil {
		h.log.WithError(err).Error("apply rules failed")
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "applied"})
}

func (h *FirewallHandler) Rollback(c *gin.Context) {
	if err := h.svc.Rollback(c.Request.Context()); err != nil {
		h.log.WithError(err).Error("rollback failed")
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "rolled back"})
}

func (h *FirewallHandler) Counters(c *gin.Context) {
	counters, err := h.svc.GetCounters(c.Request.Context())
	if err != nil {
		h.log.WithError(err).Error("get counters failed")
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"counters": counters})
}

func (h *FirewallHandler) GetInterfaces(c *gin.Context) {
	interfaces, err := h.svc.GetInterfaces(c.Request.Context())
	if err != nil {
		h.log.WithError(err).Error("get interfaces failed")
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"interfaces": interfaces})
}

func (h *FirewallHandler) GetInterfaceCounters(c *gin.Context) {
	iface := c.Param("interface")
	counters, err := h.svc.GetInterfaceCounters(c.Request.Context(), iface)
	if err != nil {
		h.log.WithError(err).Error("get interface counters failed")
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"counters": counters})
}

func (h *FirewallHandler) GetAggregatedCounters(c *gin.Context) {
	counters, err := h.svc.GetAggregatedCounters(c.Request.Context())
	if err != nil {
		h.log.WithError(err).Error("get aggregated counters failed")
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"counters": counters})
}

func HealthHandler(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":  "ok",
		"service": "firewall-manager",
	})
}