'use strict'

class Role {
    static Battler = 'battler'
    static Tradeskiller = 'tradeskiller'
    static Woodcutter = 'woodcutter'
    static Stonecutter = 'stonecutter'
    static Miner = 'miner'
    static Alchemist = 'alchemist'
    static RuneCrafter = 'runecrafter'
    static JewelCrafter = 'jewelcrafter'
    static Main = 'main'
    static Alt = 'alt'
    static Dungeoneer = 'dungeoneer'
}

class Resource {
    static Currency = {
        Gold: 'Gold',
        Credits: 'Credits',
        BoundCredits: 'Bound Credits',
        HonorTokens: 'Honor Tokens',
        BossTokens: 'Boss Tokens',
        DungeoneeringTokens: 'Dungeoneering Tokens',
        GatheringSkillShard: 'Gathering Skill Shard',
        ArtisanShard: 'Artisan Shard',
        HeroicShard: 'Heroic Shard',
    }
    static Resources = {
        Wood: 'Wood',
        Metal: 'Metal',
        Stone: 'Stone',
    }
    static CraftingComponents = {
        WeaponComponent: 'Weapon Component',
        ArmorComponent: 'Armor Component',
        ToolComponent: 'Tool Component',
        GemFragments: 'Gem Fragments',
        TrinketFragments: 'Trinket Fragments',
        RunicLeather: 'Runic Leather',
        TrinketEssence: 'Trinket Essence',
    }
    static AlchemyIngredients = {
        TreeSap: 'Tree Sap',
        SpiderEgg: 'Spider Egg',
        BoneMeal: 'Bone Meal',
        AlchemicalDust: 'Alchemical Dust',
        VialOfOrcBlood: 'Vial of Orc Blood',
        UndeadHeart: 'Undead Heart',
        BirdsNest: "Bird's Nest",
        AlchemicEssence: 'Alchemic Essence',
        GoldenEgg: 'Golden Egg',
        DemonicDust: 'Demonic Dust',
    }
    static Potions = {
        TrainingGatheringPotion: 'Training Gathering Potion',
        TrainingExpPotion: 'Training Exp Potion',
        MinorGatheringPotion: 'Minor Gathering Potion',
        MinorExpPotion: 'Minor Exp Potion',
        HastePotion: 'Haste Potion',
        SuperiorHastePotion: 'Superior Haste Potion',
        MinorAutosPotion: 'Minor Autos Potion',
        AptitudePotion: 'Aptitude Potion',
        GreaterExpPotion: 'Greater Exp Potion',
        HeroicPotion: 'Heroic Potion',
        UltraExpPotion: 'Ultra Exp Potion',
    }
    static Gems = {
        Sapphire: 'Sapphire',
        Ruby: 'Ruby',
        Emerald: 'Emerald',
        Diamond: 'Diamond',
    }
    static Stones = {
        Sandstone: 'Sandstone',
        Marble: 'Marble',
        Malachite: 'Malachite',
    }
    static UpgradeStones = {
        HealthUpgradeStone: 'Health Upgrade Stone',
        DamageUpgradeStone: 'Damage Upgrade Stone',
    }
    static DungeonKeys = {
        GoblinCaveKey: 'Goblin Cave Key',
        MountainPassKey: 'Mountain Pass Key',
        DesolateTombsKey: 'Desolate Tombs Key',
        DragonkinLairKey: 'Dragonkin Lair Key',
        AbandonedTowerKey: 'Abandoned Tower Key',
        HauntedCellsKey: 'Haunted Cells Key',
        HallOfDragonsKey: 'Hall Of Dragons Key',
        TheVaultKey: 'The Vault Key',
        TheTreasuryKey: 'The Treasury Key',
    }
    static Runes = {
        TrainingRune1: 'Training Rune 1',
        TrainingRune2: 'Training Rune 2',
        TrainingRune3: 'Training Rune 3',
        TrainingRune4: 'Training Rune 4',
        RuneOfTheWarrior: 'Rune Of The Warrior',
        RuneOfTheGladiator: 'Rune Of The Gladiator',
        RuneOfTheWarlord: 'Rune Of The Warlord',
        RuneOfTheOverlord: 'Rune Of The Overlord',
        GreaterRuneOfTheWarlord: 'Greater Rune Of The Warlord',
    }
    static Misc = {
        ResourceCache: 'Resource Cache',
    }
}

const charSettings = {
    Arius: { roles: [Role.Battler, Role.Main], },
    Battlarius: { roles: [Role.Battler, Role.Alt], },
    Killarius: { roles: [Role.Battler, Role.Alt], },
    Huntarius: { roles: [Role.Battler, Role.Alt], },
    Gladiarius: { roles: [Role.Battler, Role.Alt], },
    Mercenarius: { roles: [Role.Battler, Role.Alt], },
    Wooarius: {
        roles: [Role.Tradeskiller, Role.Woodcutter, Role.Alchemist, Role.Alt, Role.Dungeoneer],
        resource: Resource.Resources.Wood,
    },
    Woodarius: {
        roles: [Role.Tradeskiller, Role.Woodcutter, Role.Alt, Role.Dungeoneer],
        resource: Resource.Resources.Wood,
    },
    Choparius: {
        roles: [Role.Tradeskiller, Role.Woodcutter, Role.Alt, Role.Dungeoneer],
        resource: Resource.Resources.Wood,
    },
    Lumberarius: {
        roles: [Role.Tradeskiller, Role.Woodcutter, Role.Alt, Role.Dungeoneer],
        resource: Resource.Resources.Wood,
    },
    Stonarius: {
        roles: [Role.Tradeskiller, Role.Stonecutter, Role.Alt],
        resource: Resource.Resources.Stone,
    },
    Quararius: {
        roles: [Role.Tradeskiller, Role.Stonecutter, Role.Alt],
        resource: Resource.Resources.Stone,
    },
    Rockarius: {
        roles: [Role.Tradeskiller, Role.Stonecutter, Role.Alt],
        resource: Resource.Resources.Stone,
    },
    Bouldarius: {
        roles: [Role.Tradeskiller, Role.Stonecutter, Role.Alt, Role.Dungeoneer],
        resource: Resource.Resources.Stone,
    },
    Minarius: {
        roles: [Role.Tradeskiller, Role.Miner, Role.Alt, Role.Dungeoneer],
        resource: Resource.Resources.Metal,
    },
    Metalarius: {
        roles: [Role.Tradeskiller, Role.Miner, Role.Alt, Role.Dungeoneer],
        resource: Resource.Resources.Metal,
    },
    Gemarius: {
        roles: [Role.Tradeskiller, Role.Miner, Role.Alt, Role.Dungeoneer],
        resource: Resource.Resources.Metal,
    },
    Minerarius: {
        roles: [Role.Tradeskiller, Role.Miner, Role.Alt, Role.Dungeoneer],
        resource: Resource.Resources.Metal,
    },
    Runarius: {
        roles: [Role.RuneCrafter, Role.Alt, Role.Dungeoneer],
        resource: Resource.Resources.Stone,
        labyrinth: {
            enabled: false,
        },
    },
    Jewelarius: {
        roles: [Role.JewelCrafter, Role.Alt, Role.Dungeoneer],
        resource: Resource.Resources.Metal,
        labyrinth: {
            enabled: false,
        },
    },
}

const findCharsByRole = role => {
    const res = []
    for (const [key, val] of Object.entries(charSettings)) {
        if (val.roles.includes(role)) res.push(key)
    }

    return res
}

if (module) {
    module.exports = { charSettings }
}
