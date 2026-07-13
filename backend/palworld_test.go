package main

import (
	"strings"
	"testing"
)

const sampleConfig = `[/Script/Pal.PalGameWorldSettings]
OptionSettings=(Difficulty=None,RandomizerType=None,RandomizerSeed="",bIsRandomizerPalLevelRandom=False,DayTimeSpeedRate=1.000000,NightTimeSpeedRate=1.000000,ExpRate=1.000000,PalCaptureRate=1.000000,PalSpawnNumRate=1.000000,PalDamageRateAttack=1.000000,PalDamageRateDefense=1.000000,PlayerDamageRateAttack=1.000000,PlayerDamageRateDefense=1.000000,PlayerStomachDecreaceRate=1.000000,PlayerStaminaDecreaceRate=1.000000,PlayerAutoHPRegeneRate=1.000000,PlayerAutoHpRegeneRateInSleep=1.000000,PalStomachDecreaceRate=1.000000,PalStaminaDecreaceRate=1.000000,PalAutoHPRegeneRate=1.000000,PalAutoHpRegeneRateInSleep=1.000000,BuildObjectHpRate=1.000000,BuildObjectDamageRate=1.000000,BuildObjectDeteriorationDamageRate=1.000000,CollectionDropRate=1.000000,CollectionObjectHpRate=1.000000,CollectionObjectRespawnSpeedRate=1.000000,EnemyDropItemRate=1.000000,DeathPenalty=Item,bEnablePlayerToPlayerDamage=False,bEnableFriendlyFire=False,bEnableInvaderEnemy=True,bActiveUNKO=False,bEnableAimAssistPad=True,bEnableAimAssistKeyboard=False,DropItemMaxNum=3000,PhysicsActiveDropItemMaxNum=-1,DropItemMaxNum_UNKO=100,BaseCampMaxNum=128,BaseCampWorkerMaxNum=15,DropItemAliveMaxHours=1.000000,bAutoResetGuildNoOnlinePlayers=False,AutoResetGuildTimeNoOnlinePlayers=72.000000,GuildPlayerMaxNum=20,BaseCampMaxNumInGuild=4,PalEggDefaultHatchingTime=1.000000,WorkSpeedRate=1.000000,AutoSaveSpan=30.000000,bIsMultiplay=False,bIsPvP=False,bHardcore=False,bPalLost=False,bCharacterRecreateInHardcore=False,bCanPickupOtherGuildDeathPenaltyDrop=False,bEnableNonLoginPenalty=True,bEnableFastTravel=True,bEnableFastTravelOnlyBaseCamp=False,bIsStartLocationSelectByMap=False,bExistPlayerAfterLogout=False,bEnableDefenseOtherGuildPlayer=False,bInvisibleOtherGuildBaseCampAreaFX=False,bBuildAreaLimit=False,ItemWeightRate=1.000000,CoopPlayerMaxNum=4,ServerPlayerMaxNum=32,ServerName="Menet Palworld Server",ServerDescription="",AdminPassword="",ServerPassword="",bAllowClientMod=True,PublicPort=8212,PublicIP="203.83.44.206",RCONEnabled=False,RCONPort=25575,Region="",bUseAuth=True,BanListURL="https://b.palworldgame.com/api/banlist.txt",RESTAPIEnabled=False,RESTAPIPort=8212,bShowPlayerList=False,ChatPostLimitPerMinute=30,CrossplayPlatforms=(Steam,Xbox,PS5,Mac),bIsUseBackupSaveData=True,LogFormatType=Text,bIsShowJoinLeftMessage=True,SupplyDropSpan=180,EnablePredatorBossPal=True,MaxBuildingLimitNum=0,ServerReplicatePawnCullDistance=15000.000000,bAllowGlobalPalboxExport=True,bAllowGlobalPalboxImport=False,EquipmentDurabilityDamageRate=1.000000,ItemContainerForceMarkDirtyInterval=1.000000,PlayerDataPalStorageUpdateCheckTickInterval=1.000000,ItemCorruptionMultiplier=1.000000,MonsterFarmActionSpeedRate=1.000000,DenyTechnologyList=,GuildRejoinCooldownMinutes=0,AutoTransferMasterCheckIntervalSeconds=3600.000000,AutoTransferMasterThresholdDays=14,MaxGuildsPerFrame=10,BlockRespawnTime=5.000000,RespawnPenaltyDurationThreshold=0.000000,RespawnPenaltyTimeScale=2.000000,bDisplayPvPItemNumOnWorldMap_BaseCamp=False,bDisplayPvPItemNumOnWorldMap_Player=False,AdditionalDropItemWhenPlayerKillingInPvPMode="PlayerDropItem",AdditionalDropItemNumWhenPlayerKillingInPvPMode=1,bAdditionalDropItemWhenPlayerKillingInPvPMode=False,bEnableVoiceChat=False,VoiceChatMaxVolumeDistance=3000.000000,VoiceChatZeroVolumeDistance=15000.000000,bAllowEnhanceStat_Health=True,bAllowEnhanceStat_Attack=True,bAllowEnhanceStat_Stamina=True,bAllowEnhanceStat_Weight=True,bAllowEnhanceStat_WorkSpeed=True,bEnableBuildingPlayerUIdDisplay=False,BuildingNameDisplayCacheTTLSeconds=60)`

func TestParsePalworldSettings(t *testing.T) {
	settings, err := ParsePalworldSettings(sampleConfig)
	if err != nil {
		t.Fatalf("Failed to parse settings: %v", err)
	}

	// Test boolean parsing
	if val, ok := settings["bEnableFriendlyFire"]; !ok {
		t.Errorf("Expected to find bEnableFriendlyFire")
	} else {
		if val.Value != "False" || val.Type != TypeBool {
			t.Errorf("Expected bEnableFriendlyFire to be false, got type=%v val=%v", val.Type, val.Value)
		}
	}

	// Test numeric parsing
	if val, ok := settings["ExpRate"]; !ok {
		t.Errorf("Expected to find ExpRate")
	} else {
		if val.Value != "1.000000" || val.Type != TypeNumber {
			t.Errorf("Expected ExpRate to be 1.000000, got type=%v val=%v", val.Type, val.Value)
		}
	}

	// Test quoted string parsing
	if val, ok := settings["ServerName"]; !ok {
		t.Errorf("Expected to find ServerName")
	} else {
		if val.Value != "Menet Palworld Server" || val.Type != TypeString || !val.IsQuoted {
			t.Errorf("Expected ServerName to be 'Menet Palworld Server' (quoted), got type=%v val=%v quoted=%v", val.Type, val.Value, val.IsQuoted)
		}
	}

	// Test parenthesized array parsing
	if val, ok := settings["CrossplayPlatforms"]; !ok {
		t.Errorf("Expected to find CrossplayPlatforms")
	} else {
		if val.Value != "Steam,Xbox,PS5,Mac" || val.Type != TypeArray || !val.IsParen {
			t.Errorf("Expected CrossplayPlatforms to be 'Steam,Xbox,PS5,Mac' (paren), got type=%v val=%v paren=%v", val.Type, val.Value, val.IsParen)
		}
	}

	// Test unquoted string
	if val, ok := settings["Difficulty"]; !ok {
		t.Errorf("Expected to find Difficulty")
	} else {
		if val.Value != "None" || val.Type != TypeString || val.IsQuoted {
			t.Errorf("Expected Difficulty to be 'None' (unquoted), got type=%v val=%v quoted=%v", val.Type, val.Value, val.IsQuoted)
		}
	}
}

func TestGeneratePalworldConfig(t *testing.T) {
	settings, err := ParsePalworldSettings(sampleConfig)
	if err != nil {
		t.Fatalf("Failed to parse settings: %v", err)
	}

	// Convert current config values to flat string map for updating
	updated := make(map[string]string)
	for k, v := range settings {
		updated[k] = v.Value
	}

	// Modify some settings
	updated["ServerName"] = "My Custom Server Name"
	updated["ExpRate"] = "3.500000"
	updated["bEnableFriendlyFire"] = "true"
	updated["CrossplayPlatforms"] = "Steam,Xbox"

	newConfig, err := GeneratePalworldConfig(sampleConfig, updated)
	if err != nil {
		t.Fatalf("Failed to generate config: %v", err)
	}

	// Check if new config contains modified values formatted correctly
	if !strings.Contains(newConfig, `ServerName="My Custom Server Name"`) {
		t.Errorf("Expected modified ServerName with quotes")
	}
	if !strings.Contains(newConfig, `ExpRate=3.500000`) {
		t.Errorf("Expected modified ExpRate numeric format")
	}
	if !strings.Contains(newConfig, `bEnableFriendlyFire=True`) {
		t.Errorf("Expected modified bEnableFriendlyFire boolean format")
	}
	if !strings.Contains(newConfig, `CrossplayPlatforms=(Steam,Xbox)`) {
		t.Errorf("Expected modified CrossplayPlatforms with parens")
	}

	// Ensure unmodified settings are still there
	if !strings.Contains(newConfig, `Difficulty=None`) {
		t.Errorf("Expected unmodified Difficulty=None to remain")
	}
}
