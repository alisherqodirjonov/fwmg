package network

import "github.com/sirupsen/logrus"

// MockDriver is a mock network driver for testing.
type MockDriver struct {
	log *logrus.Logger
}

// NewMockDriver creates a new MockDriver.
func NewMockDriver(log *logrus.Logger) *MockDriver {
	return &MockDriver{log: log}
}

// GetInterfaces returns a static list of interfaces for testing.
func (d *MockDriver) GetInterfaces() ([]Info, error) {
	return []Info{
		{Name: "eth0", IP: "192.168.1.100", Mask: "24", Gateway: "192.168.1.1", MAC: "00:11:22:33:44:55", Enabled: true},
		{Name: "eth1", IP: "10.0.0.5", Mask: "8", Gateway: "", MAC: "AA:BB:CC:DD:EE:FF", Enabled: false},
		{Name: "wg0", IP: "10.100.100.1", Mask: "24", Gateway: "", MAC: "DE:AD:BE:EF:00:00", Enabled: true},
	}, nil
}

// ApplyConfig logs the configuration that would be applied.
func (d *MockDriver) ApplyConfig(ifaceName, ip, mask, gateway string, enabled bool) error {
	d.log.WithFields(logrus.Fields{
		"interface": ifaceName,
		"ip":        ip,
		"mask":      mask,
		"gateway":   gateway,
		"enabled":   enabled,
	}).Info("MOCK: Applying network configuration")
	return nil
}
