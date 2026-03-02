package service

import (
	"context"
	"fmt"
	"time"

	"github.com/firewall-manager/backend/internal/firewall"
	"github.com/firewall-manager/backend/internal/models"
	"github.com/firewall-manager/backend/internal/network"
	"github.com/firewall-manager/backend/internal/repository"
	"github.com/google/uuid"
	"github.com/sirupsen/logrus"
)

// ConfigUpdateDTO is for updating firewall configuration
type ConfigUpdateDTO struct {
	IPForwarding bool `json:"ipForwarding"`
	NATEnabled   bool `json:"natEnabled"`
}

// ConfigService manages firewall configuration
type ConfigService interface {
	GetConfig(ctx context.Context) (*models.FirewallConfig, error)
	UpdateConfig(ctx context.Context, dto ConfigUpdateDTO) (*models.FirewallConfig, error)
}

type configService struct {
	configRepo repository.ConfigRepository
	driver     firewall.FirewallDriver
	log        *logrus.Logger
}

func NewConfigService(configRepo repository.ConfigRepository, driver firewall.FirewallDriver, log *logrus.Logger) ConfigService {
	return &configService{
		configRepo: configRepo,
		driver:     driver,
		log:        log,
	}
}

func (s *configService) GetConfig(ctx context.Context) (*models.FirewallConfig, error) {
	return s.configRepo.Get()
}

func (s *configService) UpdateConfig(ctx context.Context, dto ConfigUpdateDTO) (*models.FirewallConfig, error) {
	cfg, err := s.configRepo.Get()
	if err != nil {
		return nil, err
	}

	cfg.IPForwarding = dto.IPForwarding
	cfg.NATEnabled = dto.NATEnabled
	cfg.UpdatedAt = time.Now()

	// First save the configuration to the database
	if err := s.configRepo.Update(cfg); err != nil {
		s.log.WithError(err).Error("failed to save config to database")
		return nil, err
	}

	// Then immediately apply the configuration to the system (e.g., sysctl for IP forwarding)
	if err := s.driver.ApplyConfig(cfg); err != nil {
		s.log.WithError(err).Error("failed to apply firewall config to system")
		// Log the error but don't fail the update - config is saved, just not applied yet
		return cfg, fmt.Errorf("config saved but failed to apply: %w", err)
	}

	s.log.WithFields(logrus.Fields{
		"ip_forwarding": cfg.IPForwarding,
		"nat_enabled":   cfg.NATEnabled,
	}).Info("firewall configuration updated and applied successfully")

	return cfg, nil
}

// InterfaceService manages network interfaces
type CreateInterfaceDTO struct {
	Name    string `json:"name" binding:"required"`
	Zone    string `json:"zone" binding:"required"`
	Enabled bool   `json:"enabled"`
	Notes   string `json:"notes"`
	IP      string `json:"ip"`
	Mask    string `json:"mask"`
	Gateway string `json:"gateway"`
}

type UpdateInterfaceDTO struct {
	Name    string `json:"name"`
	Zone    string `json:"zone"`
	Enabled bool   `json:"enabled"`
	Notes   string `json:"notes"`
	IP      string `json:"ip"`
	Mask    string `json:"mask"`
	Gateway string `json:"gateway"`
}

// InterfaceWithStatus combines DB model with live system info
type InterfaceWithStatus struct {
	*models.NetworkInterface
	IP      string `json:"ip"`
	Mask    string `json:"mask"`
	Gateway string `json:"gateway"`
	MAC     string `json:"mac"`
}

type InterfaceService interface {
	ListInterfaces(ctx context.Context) ([]InterfaceWithStatus, error)
	CreateInterface(ctx context.Context, dto CreateInterfaceDTO) (*models.NetworkInterface, error)
	UpdateInterface(ctx context.Context, id string, dto UpdateInterfaceDTO) (*models.NetworkInterface, error)
	DeleteInterface(ctx context.Context, id string) error
}

type interfaceService struct {
	ifaceRepo repository.InterfaceRepository
	netDriver network.Driver
	log       *logrus.Logger
}

func NewInterfaceService(ifaceRepo repository.InterfaceRepository, netDriver network.Driver, log *logrus.Logger) InterfaceService {
	return &interfaceService{
		ifaceRepo: ifaceRepo,
		netDriver: netDriver,
		log:       log,
	}
}

func (s *interfaceService) ListInterfaces(ctx context.Context) ([]InterfaceWithStatus, error) {
	// 1. Get interfaces from DB
	dbIfaces, err := s.ifaceRepo.List()
	if err != nil {
		return nil, err
	}

	// 2. Get interfaces from System
	sysIfaces, err := s.netDriver.GetInterfaces()
	if err != nil {
		s.log.WithError(err).Warn("failed to get system interfaces")
		// Continue with just DB interfaces if system fails
	}

	// 3. Merge them. System is source of truth for existence and IP.
	// DB is source of truth for Zone and Notes.

	// Map DB interfaces by name for quick lookup
	dbMap := make(map[string]*models.NetworkInterface)
	for _, iface := range dbIfaces {
		dbMap[iface.Name] = iface
	}

	var result []InterfaceWithStatus

	// Iterate system interfaces
	for _, sys := range sysIfaces {
		dbIface, exists := dbMap[sys.Name]

		if !exists {
			// Auto-create in DB if it exists on system but not in DB
			now := time.Now()
			newIface := &models.NetworkInterface{
				ID:        uuid.New().String(),
				Name:      sys.Name,
				Zone:      "public", // Default zone
				Enabled:   sys.Enabled,
				Notes:     "Auto-discovered",
				CreatedAt: now,
				UpdatedAt: now,
			}
			if err := s.ifaceRepo.Create(newIface); err != nil {
				s.log.WithError(err).Error("failed to auto-create interface")
				continue
			}
			dbIface = newIface
		}

		// Combine data
		result = append(result, InterfaceWithStatus{
			NetworkInterface: dbIface,
			IP:               sys.IP,
			Mask:             sys.Mask,
			Gateway:          sys.Gateway,
			MAC:              sys.MAC,
		})
	}

	return result, nil
}

func (s *interfaceService) CreateInterface(ctx context.Context, dto CreateInterfaceDTO) (*models.NetworkInterface, error) {
	now := time.Now()
	iface := &models.NetworkInterface{
		ID:        uuid.New().String(),
		Name:      dto.Name,
		Zone:      dto.Zone,
		Enabled:   dto.Enabled,
		Notes:     dto.Notes,
		CreatedAt: now,
		UpdatedAt: now,
	}

	if err := s.ifaceRepo.Create(iface); err != nil {
		return nil, err
	}

	return iface, nil
}

func (s *interfaceService) UpdateInterface(ctx context.Context, id string, dto UpdateInterfaceDTO) (*models.NetworkInterface, error) {
	iface, err := s.ifaceRepo.Get(id)
	if err != nil {
		return nil, fmt.Errorf("interface not found: %w", err)
	}

	if dto.Name != "" {
		iface.Name = dto.Name
	}
	if dto.Zone != "" {
		iface.Zone = dto.Zone
	}
	iface.Enabled = dto.Enabled
	iface.Notes = dto.Notes

	// Apply config to system
	if err := s.netDriver.ApplyConfig(iface.Name, dto.IP, dto.Mask, dto.Gateway, dto.Enabled); err != nil {
		return nil, fmt.Errorf("failed to apply network config: %w", err)
	}

	if err := s.ifaceRepo.Update(iface); err != nil {
		return nil, err
	}

	return iface, nil
}

func (s *interfaceService) DeleteInterface(ctx context.Context, id string) error {
	return s.ifaceRepo.Delete(id)
}

// ZoneService manages firewall zones
type CreateZoneDTO struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
	Target      string `json:"target" binding:"required"`
	InPolicy    string `json:"inPolicy" binding:"required"`
	OutPolicy   string `json:"outPolicy" binding:"required"`
}

type UpdateZoneDTO struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Target      string `json:"target"`
	InPolicy    string `json:"inPolicy"`
	OutPolicy   string `json:"outPolicy"`
}

type ZoneService interface {
	ListZones(ctx context.Context) ([]*models.Zone, error)
	CreateZone(ctx context.Context, dto CreateZoneDTO) (*models.Zone, error)
	UpdateZone(ctx context.Context, id string, dto UpdateZoneDTO) (*models.Zone, error)
	DeleteZone(ctx context.Context, id string) error
}

type zoneService struct {
	zoneRepo repository.ZoneRepository
	log      *logrus.Logger
}

func NewZoneService(zoneRepo repository.ZoneRepository, log *logrus.Logger) ZoneService {
	return &zoneService{
		zoneRepo: zoneRepo,
		log:      log,
	}
}

func (s *zoneService) ListZones(ctx context.Context) ([]*models.Zone, error) {
	return s.zoneRepo.List()
}

func (s *zoneService) CreateZone(ctx context.Context, dto CreateZoneDTO) (*models.Zone, error) {
	now := time.Now()
	zone := &models.Zone{
		ID:          uuid.New().String(),
		Name:        dto.Name,
		Description: dto.Description,
		Target:      dto.Target,
		InPolicy:    dto.InPolicy,
		OutPolicy:   dto.OutPolicy,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if err := s.zoneRepo.Create(zone); err != nil {
		return nil, err
	}

	return zone, nil
}

func (s *zoneService) UpdateZone(ctx context.Context, id string, dto UpdateZoneDTO) (*models.Zone, error) {
	zone, err := s.zoneRepo.Get(id)
	if err != nil {
		return nil, fmt.Errorf("zone not found: %w", err)
	}

	if dto.Name != "" {
		zone.Name = dto.Name
	}
	if dto.Description != "" {
		zone.Description = dto.Description
	}
	if dto.Target != "" {
		zone.Target = dto.Target
	}
	if dto.InPolicy != "" {
		zone.InPolicy = dto.InPolicy
	}
	if dto.OutPolicy != "" {
		zone.OutPolicy = dto.OutPolicy
	}

	if err := s.zoneRepo.Update(zone); err != nil {
		return nil, err
	}

	return zone, nil
}

func (s *zoneService) DeleteZone(ctx context.Context, id string) error {
	return s.zoneRepo.Delete(id)
}

// NATRuleService manages NAT rules
type CreateNATRuleDTO struct {
	Name         string `json:"name" binding:"required"`
	Type         string `json:"type" binding:"required"` // SNAT or DNAT
	Protocol     string `json:"protocol"`
	InInterface  string `json:"inInterface"`
	OutInterface string `json:"outInterface"`
	SourceIP     string `json:"sourceIP"`
	SourcePort   string `json:"sourcePort"`
	DestIP       string `json:"destIP"`
	DestPort     string `json:"destPort"`
	NATtoIP      string `json:"nattoIP" binding:"required"`
	NATtoPort    string `json:"nattoPort"`
	Comment      string `json:"comment"`
	Enabled      bool   `json:"enabled"`
	Position     int    `json:"position"`
}

type UpdateNATRuleDTO struct {
	Name         string `json:"name"`
	Type         string `json:"type"`
	Protocol     string `json:"protocol"`
	InInterface  string `json:"inInterface"`
	OutInterface string `json:"outInterface"`
	SourceIP     string `json:"sourceIP"`
	SourcePort   string `json:"sourcePort"`
	DestIP       string `json:"destIP"`
	DestPort     string `json:"destPort"`
	NATtoIP      string `json:"nattoIP"`
	NATtoPort    string `json:"nattoPort"`
	Comment      string `json:"comment"`
	Enabled      bool   `json:"enabled"`
	Position     int    `json:"position"`
}

type NATRuleService interface {
	ListNATRules(ctx context.Context) ([]*models.NATRule, error)
	CreateNATRule(ctx context.Context, dto CreateNATRuleDTO) (*models.NATRule, error)
	UpdateNATRule(ctx context.Context, id string, dto UpdateNATRuleDTO) (*models.NATRule, error)
	DeleteNATRule(ctx context.Context, id string) error
}

type natRuleService struct {
	natRepo repository.NATRuleRepository
	log     *logrus.Logger
}

func NewNATRuleService(natRepo repository.NATRuleRepository, log *logrus.Logger) NATRuleService {
	return &natRuleService{
		natRepo: natRepo,
		log:     log,
	}
}

func (s *natRuleService) ListNATRules(ctx context.Context) ([]*models.NATRule, error) {
	return s.natRepo.List()
}

func (s *natRuleService) CreateNATRule(ctx context.Context, dto CreateNATRuleDTO) (*models.NATRule, error) {
	if dto.Type != "SNAT" && dto.Type != "DNAT" {
		return nil, fmt.Errorf("invalid NAT type: must be SNAT or DNAT")
	}

	now := time.Now()
	rule := &models.NATRule{
		ID:           uuid.New().String(),
		Name:         dto.Name,
		Type:         dto.Type,
		Protocol:     models.Protocol(dto.Protocol),
		InInterface:  dto.InInterface,
		OutInterface: dto.OutInterface,
		SourceIP:     dto.SourceIP,
		SourcePort:   dto.SourcePort,
		DestIP:       dto.DestIP,
		DestPort:     dto.DestPort,
		NATtoIP:      dto.NATtoIP,
		NATtoPort:    dto.NATtoPort,
		Comment:      dto.Comment,
		Enabled:      dto.Enabled,
		Position:     dto.Position,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	if err := s.natRepo.Create(rule); err != nil {
		return nil, err
	}

	return rule, nil
}

func (s *natRuleService) UpdateNATRule(ctx context.Context, id string, dto UpdateNATRuleDTO) (*models.NATRule, error) {
	rule, err := s.natRepo.Get(id)
	if err != nil {
		return nil, fmt.Errorf("NAT rule not found: %w", err)
	}

	if dto.Name != "" {
		rule.Name = dto.Name
	}
	if dto.Type != "" {
		rule.Type = dto.Type
	}
	if dto.Protocol != "" {
		rule.Protocol = models.Protocol(dto.Protocol)
	}
	if dto.InInterface != "" {
		rule.InInterface = dto.InInterface
	}
	if dto.OutInterface != "" {
		rule.OutInterface = dto.OutInterface
	}
	if dto.SourceIP != "" {
		rule.SourceIP = dto.SourceIP
	}
	if dto.SourcePort != "" {
		rule.SourcePort = dto.SourcePort
	}
	if dto.DestIP != "" {
		rule.DestIP = dto.DestIP
	}
	if dto.DestPort != "" {
		rule.DestPort = dto.DestPort
	}
	if dto.NATtoIP != "" {
		rule.NATtoIP = dto.NATtoIP
	}
	if dto.NATtoPort != "" {
		rule.NATtoPort = dto.NATtoPort
	}
	if dto.Comment != "" {
		rule.Comment = dto.Comment
	}
	rule.Enabled = dto.Enabled
	rule.Position = dto.Position

	if err := s.natRepo.Update(rule); err != nil {
		return nil, err
	}

	return rule, nil
}

func (s *natRuleService) DeleteNATRule(ctx context.Context, id string) error {
	return s.natRepo.Delete(id)
}
