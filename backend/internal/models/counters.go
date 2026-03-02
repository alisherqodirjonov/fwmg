package models

// Interface represents a network interface.
type Interface struct {
	Name string `json:"name"`
}

// CounterStats holds the packet and byte counts for a specific metric.
type CounterStats struct {
	Packets uint64 `json:"packets"`
	Bytes   uint64 `json:"bytes"`
}

// InterfaceCounters holds all the counters for a specific network interface.
type InterfaceCounters struct {
	In   CounterStats `json:"in"`
	Out  CounterStats `json:"out"`
	Drop CounterStats `json:"drop"`
}
