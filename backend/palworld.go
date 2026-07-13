package main

import (
	"fmt"
	"strings"
	"unicode"
)

// SettingType represents the type of config option
type SettingType string

const (
	TypeBool   SettingType = "bool"
	TypeNumber SettingType = "number"
	TypeString SettingType = "string"
	TypeArray  SettingType = "array"
)

// ConfigValue represents a parsed configuration value with metadata
type ConfigValue struct {
	Value      string      `json:"value"`      // Cleaned value for frontend
	RawValue   string      `json:"rawValue"`   // Raw value as it appears in the file
	Type       SettingType `json:"type"`       // Dynamic type
	IsQuoted   bool        `json:"isQuoted"`   // Did it have double quotes in the file?
	IsParen    bool        `json:"isParen"`    // Did it have parentheses? (e.g. lists)
}

// ParsePalworldSettings parses the Palworld configuration content
func ParsePalworldSettings(content string) (map[string]ConfigValue, error) {
	// Find OptionSettings=(...)
	idx := strings.Index(content, "OptionSettings=(")
	if idx == -1 {
		return nil, fmt.Errorf("OptionSettings block not found in configuration")
	}
	start := idx + len("OptionSettings=(")
	end := strings.LastIndex(content, ")")
	if end == -1 || end <= start {
		return nil, fmt.Errorf("closing parenthesis for OptionSettings not found")
	}

	settingsStr := content[start:end]
	settings := make(map[string]ConfigValue)

	var key, val strings.Builder
	inQuotes := false
	parenDepth := 0
	inKey := true

	for i := 0; i < len(settingsStr); i++ {
		ch := settingsStr[i]
		if inKey {
			if ch == '=' {
				inKey = false
			} else {
				key.WriteByte(ch)
			}
		} else {
			if ch == '"' {
				inQuotes = !inQuotes
				val.WriteByte(ch)
			} else if ch == '(' && !inQuotes {
				parenDepth++
				val.WriteByte(ch)
			} else if ch == ')' && !inQuotes {
				parenDepth--
				val.WriteByte(ch)
			} else if ch == ',' && !inQuotes && parenDepth == 0 {
				// End of key-value pair
				k := strings.TrimSpace(key.String())
				v := strings.TrimSpace(val.String())
				if k != "" {
					settings[k] = parseConfigValue(v)
				}
				key.Reset()
				val.Reset()
				inKey = true
			} else {
				val.WriteByte(ch)
			}
		}
	}
	// Add the last pair
	k := strings.TrimSpace(key.String())
	v := strings.TrimSpace(val.String())
	if k != "" {
		settings[k] = parseConfigValue(v)
	}

	return settings, nil
}

// parseConfigValue analyzes the raw string value and returns a ConfigValue
func parseConfigValue(raw string) ConfigValue {
	cv := ConfigValue{
		RawValue: raw,
		Type:     TypeString,
	}

	// Check if it's quoted
	if len(raw) >= 2 && raw[0] == '"' && raw[len(raw)-1] == '"' {
		cv.IsQuoted = true
		cv.Value = raw[1 : len(raw)-1]
		cv.Type = TypeString
		return cv
	}

	// Check if it's parenthesized (array/list)
	if len(raw) >= 2 && raw[0] == '(' && raw[len(raw)-1] == ')' {
		cv.IsParen = true
		cv.Value = raw[1 : len(raw)-1]
		cv.Type = TypeArray
		return cv
	}

	cv.Value = raw

	// Check if boolean
	lower := strings.ToLower(raw)
	if lower == "true" || lower == "false" {
		cv.Type = TypeBool
		return cv
	}

	// Check if numeric
	if isNumeric(raw) {
		cv.Type = TypeNumber
		return cv
	}

	return cv
}

func isNumeric(s string) bool {
	if s == "" {
		return false
	}
	hasDot := false
	for i, ch := range s {
		if ch == '-' || ch == '+' {
			if i != 0 {
				return false
			}
		} else if ch == '.' {
			if hasDot {
				return false // Multiple dots
			}
			hasDot = true
		} else if !unicode.IsDigit(ch) {
			return false
		}
	}
	return true
}

// GeneratePalworldConfig rebuilds the configuration file by updating settings in place
func GeneratePalworldConfig(originalContent string, updatedValues map[string]string) (string, error) {
	// Find the original OptionSettings=(...) block
	idx := strings.Index(originalContent, "OptionSettings=(")
	if idx == -1 {
		// If not found, let's create a standard structure
		var pairs []string
		for k, v := range updatedValues {
			pairs = append(pairs, fmt.Sprintf("%s=%s", k, formatValueForFile(k, v, nil)))
		}
		return fmt.Sprintf("[/Script/Pal.PalGameWorldSettings]\nOptionSettings=(%s)\n", strings.Join(pairs, ",")), nil
	}

	start := idx + len("OptionSettings=(")
	end := strings.LastIndex(originalContent, ")")
	if end == -1 || end <= start {
		return "", fmt.Errorf("closing parenthesis not found in original configuration")
	}

	// We need to parse original settings first to determine their type and original formatting (quoted, paren, etc.)
	originalSettings, err := ParsePalworldSettings(originalContent)
	if err != nil {
		return "", fmt.Errorf("failed to parse original settings: %w", err)
	}

	// Parse keys in their original order
	settingsStr := originalContent[start:end]
	var keys []string

	var key strings.Builder
	inQuotes := false
	parenDepth := 0
	inKey := true

	for i := 0; i < len(settingsStr); i++ {
		ch := settingsStr[i]
		if inKey {
			if ch == '=' {
				inKey = false
				keys = append(keys, strings.TrimSpace(key.String()))
				key.Reset()
			} else {
				key.WriteByte(ch)
			}
		} else {
			if ch == '"' {
				inQuotes = !inQuotes
			} else if ch == '(' && !inQuotes {
				parenDepth++
			} else if ch == ')' && !inQuotes {
				parenDepth--
			} else if ch == ',' && !inQuotes && parenDepth == 0 {
				inKey = true
			}
		}
	}

	// Reconstruct the OptionSettings section
	var updatedPairs []string
	seen := make(map[string]bool)

	for _, k := range keys {
		origVal, hasOrig := originalSettings[k]
		newVal, hasNew := updatedValues[k]

		if hasNew {
			var metadata *ConfigValue
			if hasOrig {
				metadata = &origVal
			}
			updatedPairs = append(updatedPairs, fmt.Sprintf("%s=%s", k, formatValueForFile(k, newVal, metadata)))
			seen[k] = true
		} else if hasOrig {
			// Keep original if not updated
			updatedPairs = append(updatedPairs, fmt.Sprintf("%s=%s", k, origVal.RawValue))
			seen[k] = true
		}
	}

	// Add any new keys that weren't in the original settings
	for k, newVal := range updatedValues {
		if !seen[k] {
			updatedPairs = append(updatedPairs, fmt.Sprintf("%s=%s", k, formatValueForFile(k, newVal, nil)))
		}
	}

	newOptionSettings := "OptionSettings=(" + strings.Join(updatedPairs, ",") + ")"

	// Return content with replaced OptionSettings
	before := originalContent[:idx]
	after := originalContent[end+1:]

	return before + newOptionSettings + after, nil
}

// formatValueForFile formats a value correctly for the configuration file based on metadata or dynamic rules
func formatValueForFile(key string, val string, meta *ConfigValue) string {
	// If we have original metadata, use it to decide quotes or parentheses
	if meta != nil {
		if meta.IsQuoted {
			// Make sure it doesn't already have quotes
			if len(val) >= 2 && val[0] == '"' && val[len(val)-1] == '"' {
				return val
			}
			return fmt.Sprintf("\"%s\"", val)
		}
		if meta.IsParen {
			// Make sure it doesn't already have parens
			if len(val) >= 2 && val[0] == '(' && val[len(val)-1] == ')' {
				return val
			}
			return fmt.Sprintf("(%s)", val)
		}
		// If it's boolean, make sure it is capitalized (True/False)
		if meta.Type == TypeBool {
			lower := strings.ToLower(val)
			if lower == "true" {
				return "True"
			}
			if lower == "false" {
				return "False"
			}
		}
		return val
	}

	// Fallback dynamic rules for new options
	// Booleans
	lower := strings.ToLower(val)
	if lower == "true" {
		return "True"
	}
	if lower == "false" {
		return "False"
	}

	// Arrays (e.g. CrossplayPlatforms)
	if strings.Contains(key, "Platforms") || strings.Contains(key, "List") {
		if !strings.HasPrefix(val, "(") && !strings.HasSuffix(val, ")") {
			return fmt.Sprintf("(%s)", val)
		}
	}

	// If numeric or empty or already quoted, return as is
	if isNumeric(val) || val == "" || (len(val) >= 2 && val[0] == '"' && val[len(val)-1] == '"') {
		return val
	}

	// Strings that look like names or text get quoted
	return fmt.Sprintf("\"%s\"", val)
}
