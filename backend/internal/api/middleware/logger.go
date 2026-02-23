package middleware

import (
	"time"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
)

func RequestLogger(log *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		method := c.Request.Method

		c.Next()

		latency := time.Since(start)
		status := c.Writer.Status()

		entry := log.WithFields(logrus.Fields{
			"method":  method,
			"path":    path,
			"status":  status,
			"latency": latency,
			"ip":      c.ClientIP(),
		})

		if status >= 500 {
			entry.Error("server error")
		} else if status >= 400 {
			entry.Warn("client error")
		} else {
			entry.Info("request")
		}
	}
}