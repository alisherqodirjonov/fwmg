package handlers

import (
	"net/http"

	"github.com/firewall-manager/backend/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
)

type RuleHandler struct {
	svc service.FirewallService
	log *logrus.Logger
}

func NewRuleHandler(svc service.FirewallService, log *logrus.Logger) *RuleHandler {
	return &RuleHandler{svc: svc, log: log}
}

func (h *RuleHandler) List(c *gin.Context) {
	rules, err := h.svc.ListRules(c.Request.Context())
	if err != nil {
		h.log.WithError(err).Error("list rules failed")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list rules"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"rules": rules})
}

func (h *RuleHandler) Create(c *gin.Context) {
	var dto service.CreateRuleDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	rule, err := h.svc.CreateRule(c.Request.Context(), dto)
	if err != nil {
		h.log.WithError(err).Error("create rule failed")
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"rule": rule})
}

func (h *RuleHandler) Update(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing rule id"})
		return
	}

	var dto service.UpdateRuleDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	rule, err := h.svc.UpdateRule(c.Request.Context(), id, dto)
	if err != nil {
		h.log.WithError(err).WithField("id", id).Error("update rule failed")
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"rule": rule})
}

func (h *RuleHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing rule id"})
		return
	}

	if err := h.svc.DeleteRule(c.Request.Context(), id); err != nil {
		h.log.WithError(err).WithField("id", id).Error("delete rule failed")
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusNoContent, nil)
}