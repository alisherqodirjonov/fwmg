package main

import (
	"os"
	"strings"
)

type Config struct {
	Port           string
	Env            string
	DBPath         string
	APIKey         string
	AllowedOrigins []string
}

func loadConfig() Config {
	origins := os.Getenv("ALLOWED_ORIGINS")
	if origins == "" {
		origins = "http://localhost:5173"
	}

	apiKey := os.Getenv("API_KEY")
	if apiKey == "" {
		apiKey = "dev-insecure-key-change-in-production"
	}

	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "./firewall.db"
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	env := os.Getenv("ENV")
	if env == "" {
		env = "development"
	}

	return Config{
		Port:           port,
		Env:            env,
		DBPath:         dbPath,
		APIKey:         apiKey,
		AllowedOrigins: strings.Split(origins, ","),
	}
}