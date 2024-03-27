// ==UserScript==
// @name            IQRPG-Bot
// @namespace       http://tampermonkey.net/
// @version         0.1.4
// @description     try to take over the world!
// @author          mdrozdovz
// @match           https://test.iqrpg.com/game*
// @match           http://test.iqrpg.com/game*
// @icon            data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @require         https://cdn.jsdelivr.net/gh/lodash/lodash@4.17.4/dist/lodash.min.js
// @require         https://github.com/mdrozdovz/iqrpg-bot/raw/master/character-settings.js?v=2
// @downloadURL     https://github.com/mdrozdovz/iqrpg-bot/raw/master/iqrpg-bot-main.js
// @updateURL       https://github.com/mdrozdovz/iqrpg-bot/raw/master/version
// @grant           GM_info
// @grant           GM_getResourceText
// ==/UserScript==

(async () => {
    'use strict'

    const $ = document.querySelector.bind(document)
    const $$ = document.querySelectorAll.bind(document)
    const delay = ms => new Promise(r => setTimeout(r, ms))
    const numberFormat = new Intl.NumberFormat('en-US', { useGrouping: true })
    const debugLogs = true

    const defaultSettings = {
        inventoryUpdate: {
            intervalSeconds: 3660
        },
        taskExecutor: {
            intervalSeconds: 30
        },
        resourceWire: {
            enabled: true,
            intervalSeconds: 3 * 3600,
            exceedFactor: 1.5,
            rssAltsFactor: 1,
            goldAltsFactor: 1,
        },
        alchemistWire: {
            enabled: true,
            intervalSeconds: 2 * 3600,
        },
        runeCrafterWire: {
            enabled: true,
            intervalSeconds: 2 * 3600,
        },
        jewelCrafterWire: {
            enabled: true,
            intervalSeconds: 2 * 3600,
        },
        dungeoneerWire: {
            enabled: true,
            intervalSeconds: 4 * 3600,
        },
        labyrinth: {
            enabled: true,
            intervalSeconds: 3600
        },
        raids: {
            enabled: true,
            intervalSeconds: 3625
        },
        abyss: {
            enabled: false,
            intervalSeconds: 3600
        },
        trinkets: {
            enabled: true,
            intervalSeconds: 7 * 3600,
            keepRarity: Rarity.Mythic,
        },
    }

    const debug = (msg, ...data) => {
        if (!debugLogs) return
        const now = new Date()
        const prefix = `[${now.toDateString()} ${now.toTimeString().split(' ')[0]}][IQRPG Bot]:`
        console.debug(`${prefix} ${msg}`, ...data)
    }

    const log = (msg, ...data) => {
        const now = new Date()
        const prefix = `[${now.toDateString()} ${now.toTimeString().split(' ')[0]}][IQRPG Bot]:`
        console.log(`${prefix} ${msg}`, ...data)
    }

    const warn = (msg, ...data) => {
        const now = new Date()
        const prefix = `[${now.toDateString()} ${now.toTimeString().split(' ')[0]}][IQRPG Bot]:`
        console.warn(`${prefix} ${msg}`, ...data)
    }

    const safeClick = async button => {
        button && button.click && button.click()
        await delay(500)
    }
    const isVisible = element => element && element.offsetParent !== null
    const isEnabled = element => element && !element.attributes.disabled && !element.classList.contains('disabled')

    const firstActionable = (...elements) => {
        for (const el of elements) {
            if (isVisible(el) && isEnabled(el)) return el
        }

        return null
    }

    const resourceGroups = [
        Resource.Currency,
        Resource.Resources,
        Resource.CraftingComponents,
        Resource.AlchemyIngredients,
        Resource.Potions,
        Resource.Gems,
        Resource.Stones,
        Resource.UpgradeStones,
        Resource.DungeonKeys,
        Resource.Runes,
        Resource.Misc
    ]

    const buttons = {
        navigation: {
            home: () => $('a[href="/"]'),
            inventory: () => $('a[href*="inventory"]'),
            market: () => $('a[href*="market"]'),
            battling: () => $('a[href*="areas"]'),
            labyrinth: () => $('a[href*="labyrinth"]'),
            land: () => $('a[href*="land"]'),
        },
        inventory: {
            jewels: () => $('div.menu > a[href="/inventory_jewels"]'),
            trinkets: () => $('div.menu > a[href="/inventory_trinkets"]'),
            resources: () => $$('div.menu > a:not([href])'),
        },
        market: {
            sendItems: () => $('a[href*=send_items]'),
            confirm: () => $('p > button'),
            change: () => $('table.table-invisible > tr > td > span > a')
        },
        battling: {
            abyss: () => _.last($$('div.accordian > div.accordian__item.clickable'))
        },
        land: {
            personnel: () => $('a[href*=personnel]'),
            raids: () => $('a[href*=raids]'),
            portals: () => $('a[href*=portals]'),
        },
        misc: {
            captchaClose: () => $('div.modal > div.close'),
            view: () => $('div.main-section>div>div>div>p>a[href]'),
            currentAction: () => $('div.progress__text'),
        }
    }

    const getCharName = async () => {
        await safeClick(buttons.navigation.home())
        const nameSelector = () => $('table.table-invisible > tr:nth-child(1) > td:nth-child(2)')
        await safeClick(buttons.misc.view())
        if (nameSelector()) return nameSelector().outerText
        return null
    }

    const wireItem = async (recipient, item, quantity) => {
        if (!quantity || !recipient || !item) return
        await safeClick(buttons.navigation.market())
        await safeClick(buttons.market.sendItems())
        await safeClick(buttons.market.change())

        const rows = [...$$('div.modal__content > table.table-invisible > tr')]
        const row = rows.find(r => r.querySelector('td > div > div > p').innerText?.includes(item))
        if (!row) {
            log('Unable to wire (not found):', item)
            await safeClick(buttons.misc.captchaClose())
            await safeClick(buttons.misc.view())
            return
        }
        await safeClick(row.querySelector('td:nth-child(3) > a').click()) // "Select" button
        const recipientField = $('input[type=text]:not([maxlength])')
        const quantityField = $('table.table-invisible > tr > td > input[type=text][maxlength]')
        recipientField.value = recipient
        quantityField.value = quantity
        recipientField.dispatchEvent(new Event('input', { bubbles: true }))
        quantityField.dispatchEvent(new Event('input', { bubbles: true }))
        await delay(100)
        await safeClick(buttons.market.confirm())
        await safeClick(buttons.misc.view())
    }

    const awaitCompletion = async (task, timeout = 60000) =>
        Promise.race([
            new Promise(async r => {
                while (true) {
                    if (unsafeWindow.bot.completed[task]) return r()
                    //log('awaiting')
                    await delay(1000)
                }
            }),
            delay(timeout).then(() => Promise.reject(`Awaiting completion of ${task} timed out after ${timeout}ms`))
        ])

    class IQRPGBot {
        settings
        timers
        eventListeners
        inventory
        taskQueue
        completed
        queueLock

        constructor(defaultSettings, charSettings) {
            const settings = {}
            _.extend(settings, defaultSettings, charSettings)
            this.settings = settings
            this.timers = {}
            this.eventListeners = { window: {}}
            this.inventory = {}
            this.taskQueue = []
            this.completed = {}
            this.queueLock = null
        }

        async processQueue() {
            if (this.queueLock) return

            this.queueLock = true
            try {
                let task = this.taskQueue.shift()
                while (!!task) {
                    log('Processing task:', task.name)
                    this.completed[task.name] = false
                    await task.exec()
                    log('Processed task:', task.name)
                    this.completed[task.name] = true
                    await delay(1000)
                    task = this.taskQueue.shift()
                }
            } finally {
                this.queueLock = null
            }
        }

        async collectInventory() {
            const res = {}
            await safeClick(buttons.navigation.inventory())
            const btns = [...buttons.inventory.resources()]

            for (const group of resourceGroups) {
                await safeClick(btns.shift())
                const rows = $$('table.table-invisible > tr')
                for (const row of rows) {
                    if (_.isEmpty(row.children)) {
                        warn('collectInventory: Skipping bad row', row)
                        continue
                    }
                    const type = row.children[0].querySelector('p').textContent.replaceAll(/[\[\]]/g, '')
                    const value = parseInt(row.children[1].textContent.replaceAll(',', ''))
                    res[type] = value
                }
            }
            await safeClick(buttons.misc.view())
            this.inventory = res
            return res
        }

        async wireToMain() {
            if (!this.settings.roles.includes(Role.Alt)) return
            const mainChar = _.first(findCharsByRole(Role.Main))

            const resData = this.resInfo()
            if (resData.factor > this.settings.resourceWire.exceedFactor) {
                const toWire = Math.floor(resData.primaryRss - resData.avg)
                await wireItem(mainChar, this.settings.resource, toWire)
            }
            if (this.settings.roles.includes(Role.Battler)) {
                await wireItem(mainChar, Resource.Currency.Gold, this.inventory[Resource.Currency.Gold])
                await wireItem(mainChar, Resource.CraftingComponents.ToolComponent, this.inventory[Resource.CraftingComponents.ToolComponent])
            }
            if (!this.settings.roles.includes(Role.Dungeoneer)) {
                for (const key of Object.values(Resource.DungeonKeys))
                    await wireItem(mainChar, key, this.inventory[key])
            }
        }

        async wireToAlts() {
            if (!this.settings.roles.includes(Role.Main)) return

            const alts = findCharsByRole(Role.Alt)
            const tsers = findCharsByRole(Role.Tradeskiller)
            const dungeoneers = findCharsByRole(Role.Dungeoneer)
            const min = _.min(Object.values(_.pick(this.inventory, Resource.Resources.Wood, Resource.Resources.Metal, Resource.Resources.Stone)))
            const rssToWire = Math.floor(min * this.settings.resourceWire.rssAltsFactor / alts.length)
            const goldToWire = Math.floor(this.inventory[Resource.Currency.Gold] * this.settings.resourceWire.goldAltsFactor / alts.length)

            log(`Wiring to each alt ${numberFormat.format(goldToWire)} gold, ${numberFormat.format(rssToWire)} wood/metal/stone:`)
            for (const alt of alts) {
                for (const type of [Resource.Resources.Wood, Resource.Resources.Metal, Resource.Resources.Stone]) {
                    await wireItem(alt, type, rssToWire)
                }
                await wireItem(alt, Resource.Currency.Gold, goldToWire)
            }

            const tcToWire = Math.floor(this.inventory[Resource.CraftingComponents.ToolComponent] / tsers.length)
            log('Wiring tool components:', tcToWire)
            for (const tser of tsers)
                await wireItem(tser, Resource.CraftingComponents.ToolComponent, tcToWire)
        }

        async wireToAlchemist() {
            if (this.settings.roles.includes(Role.Alchemist)) return
            const alch = _.first(findCharsByRole(Role.Alchemist))

            for (const ingr of Object.values(Resource.AlchemyIngredients))
                await wireItem(alch, ingr, this.inventory[ingr])
        }

        async wireToRuneCrafter() {
            if (this.settings.roles.includes(Role.RuneCrafter)) return
            const rc = _.first(findCharsByRole(Role.RuneCrafter))

            for (const stone of Object.values(Resource.Stones))
                await wireItem(rc, stone, this.inventory[stone])
        }

        async wireToJewelCrafter() {
            if (this.settings.roles.includes(Role.JewelCrafter)) return
            const jc = _.first(findCharsByRole(Role.JewelCrafter))

            for (const gem of Object.values(Resource.Gems).concat(Resource.CraftingComponents.GemFragments))
                await wireItem(jc, gem, this.inventory[gem])
        }

        async wireToDungeoneer() {
            if (this.settings.roles.includes(Role.Dungeoneer)) return

            const dungeoneers = findCharsByRole(Role.Dungeoneer)
            for (const dun of dungeoneers) {
                for (const type of Object.values(Resource.DungeonKeys)) {
                    const keysToWire = Math.floor(this.inventory[type] / dungeoneers.length)
                    await wireItem(dun, type, keysToWire)
                }
            }
        }

        async runLabyrinth() {
            const currAction = buttons.misc.currentAction().innerText
            if (/(dungeoneering|alchemy)/ig.test(currAction)) {
                log('Dungeon is in progress, skipping Labyrinth')
                return
            }

            await safeClick(buttons.navigation.labyrinth())
            await safeClick($('button'))
            await safeClick(buttons.misc.captchaClose())
            setTimeout(() => this.completed.Labyrinth = false, 1000)
            this.timers.labyrinthReward = setTimeout(async () => {
                await safeClick($('div.main-section__body > div > div > button')) // Claim rewards
                await safeClick($('div.main-section__body > div > div > a:not([href])')) // Close window
                this.completed.Labyrinth = true
                if (this.settings.abyss?.enabled) {
                    const task = {
                        name: 'Abyss',
                        exec: this.runAbyss.bind(this)
                    }
                    this.taskQueue.push(task)
                }
            }, 150 * 1000)
        }

        async runRaid() {
            await safeClick(buttons.navigation.land())
            await safeClick(buttons.land.raids())

            const rows = [...$$('table.table-invisible > tr')]
            const row = rows[1]
            const btn = row.querySelector('td:nth-child(2) > div > a')
            debug('rewards button', btn)
            if (btn && btn.innerText !== 'Get Rewards') {
                await safeClick(buttons.misc.view())
                debug('returning')
                return
            }
            await safeClick(btn)
            debug('got rewards')

            const raidsTable = _.last([...$$('table.table-invisible')])
            const raidBtn = _.last([... raidsTable.querySelectorAll('tr')])?.querySelector('td > a')
            debug('raids table', raidsTable)
            debug('raid button', raidBtn)
            debug('view button', buttons.misc.view())
            await safeClick(raidBtn)
            await safeClick(buttons.misc.view())
        }

        async runAbyss() {
            await awaitCompletion('Labyrinth', 160_000)
            await safeClick(buttons.navigation.battling())
            const currentPower = Number.parseInt($('td > a.activeText').parentElement.parentElement.childNodes[1].innerText.replaceAll(',', ''))

            await safeClick(buttons.battling.abyss())
            const abyssMobElems = Array.from($$('table.table-invisible > tr > td')).slice(0, 88) // 44 mobs
            const abyssMobs = abyssMobElems.map(e => e.innerText.replaceAll(',', '')).map(v => Number(v) || v)
            const selectedIdx = abyssMobs.findLastIndex(e => Number.isInteger(e) && currentPower >= e * 0.95)
            if (selectedIdx > 0) {
                const mobElemIdx = selectedIdx - 1
                await safeClick(abyssMobElems[mobElemIdx].childNodes[0])
                await safeClick(buttons.misc.captchaClose())
            }
        }

        async destroyTrinkets() {
            await safeClick(buttons.navigation.inventory())
            await safeClick(buttons.inventory.trinkets())
            const trinkets = Array.from($$('table.table-invisible > tr')).slice(6).filter(row => row.querySelectorAll('td').length === 5).slice(1)
            for (const trinket of trinkets) {
                const className = trinket.querySelector('td:nth-child(1) > div > div > p').className
                const rarity = Number(className.split('-')[2])
                if (rarity < this.settings.trinkets.keepRarity) {
                    const destroyBtn = trinket.querySelector('td:nth-child(5) > a')
                    await safeClick(destroyBtn)
                    const confirmBtn = trinket.querySelector('td:nth-child(5) > a')
                    await safeClick(confirmBtn)
                }
            }
            await safeClick(buttons.misc.view())
        }

        setupTaskExecutor() {
            return setInterval(this.processQueue.bind(this), this.settings.taskExecutor.intervalSeconds * 1000)
        }

        setupInventoryUpdate() {
            const task = {
                name: 'Inventory update',
                exec: this.collectInventory.bind(this)
            }
            return setInterval(() => this.taskQueue.push(task), this.settings.inventoryUpdate.intervalSeconds * 1000)
        }

        setupResourceWire() {
            const task = {
                name: 'Resource wire',
                exec: this.wireToMain.bind(this)
            }
            return setInterval(() => this.taskQueue.push(task), this.settings.resourceWire.intervalSeconds * 1000)
        }

        setupAlchemistWire() {
            const task = {
                name: 'Alchemist wire',
                exec: this.wireToAlchemist.bind(this)
            }
            return setInterval(() => this.taskQueue.push(task), this.settings.alchemistWire.intervalSeconds * 1000)
        }

        setupRuneCrafterWire() {
            const task = {
                name: 'RuneCrafter wire',
                exec: this.wireToRuneCrafter.bind(this)
            }
            return setInterval(() => this.taskQueue.push(task), this.settings.runeCrafterWire.intervalSeconds * 1000)
        }

        setupJewelCrafterWire() {
            const task = {
                name: 'JewelCrafter wire',
                exec: this.wireToJewelCrafter.bind(this)
            }
            return setInterval(() => this.taskQueue.push(task), this.settings.jewelCrafterWire.intervalSeconds * 1000)
        }

        setupDungeoneerWire() {
            const task = {
                name: 'Dungeoneer wire',
                exec: this.wireToDungeoneer.bind(this)
            }
            return setInterval(() => this.taskQueue.push(task), this.settings.dungeoneerWire.intervalSeconds * 1000)
        }

        setupLabyrinth() {
            const task = {
                name: 'Labyrinth',
                exec: this.runLabyrinth.bind(this)
            }
            return setInterval(() => this.taskQueue.push(task), this.settings.labyrinth.intervalSeconds * 1000)
        }

        setupRaids() {
            const task = {
                name: 'Raiding',
                exec: this.runRaid.bind(this)
            }
            return setInterval(() => this.taskQueue.push(task), this.settings.raids.intervalSeconds * 1000)
        }

        setupAbyss() {
            const task = {
                name: 'Abyss',
                exec: this.runAbyss.bind(this)
            }
            return setInterval(() => this.taskQueue.push(task), this.settings.abyss.intervalSeconds * 1000)
        }

        setupTrinkets() {
            const task = {
                name: 'Trinkets',
                exec: this.destroyTrinkets.bind(this)
            }
            return setInterval(() => this.taskQueue.push(task), this.settings.trinkets.intervalSeconds * 1000)
        }

        setupRefresh() {
            const task = {
                name: 'Refresh',
                exec: async () => {
                    await safeClick($('div.action-timer__text'))
                    await safeClick(buttons.misc.captchaClose())
                },
            }
            return setInterval(() => this.taskQueue.push(task), 600 * 1000)
        }

        resInfo() {
            const type = this.settings.resource
            if (type) {
                const avg = _.sum(Object.values(
                    _.pick(this.inventory, Resource.Resources.Wood, Resource.Resources.Metal, Resource.Resources.Stone)
                )) / 3
                const primaryRss = this.inventory[type]
                const factor = primaryRss / avg
                return { type, primaryRss, avg, factor }
            } else {
                return { type, primaryRss: 0, avg: 0, factor: 1 }
            }
        }

        async wireItem(recipient, item, quantity) {
            return wireItem(recipient, item, quantity)
        }

        printTimers() {
            for (const [key, val] of Object.entries(this.timers)) {
                log(`timers.${key}: ${val}`)
            }
        }

        async start() {
            log('Starting IQRPG Bot with settings:', this.settings)


            log('Collecting inventory')
            await this.collectInventory()
            this.timers.inventoryUpdate = this.setupInventoryUpdate()
            this.timers.taskExecutor = this.setupTaskExecutor()
            if (this.settings.resourceWire?.enabled) this.timers.resourceWire = this.setupResourceWire()
            if (this.settings.alchemistWire?.enabled) this.timers.alchemistWire = this.setupAlchemistWire()
            if (this.settings.runeCrafterWire?.enabled) this.timers.runeCrafterWire = this.setupRuneCrafterWire()
            if (this.settings.jewelCrafterWire?.enabled) this.timers.jewelCrafterWire = this.setupJewelCrafterWire()
            if (this.settings.dungeoneerWire?.enabled) this.timers.dungeoneerWire = this.setupDungeoneerWire()
            if (this.settings.labyrinth?.enabled) this.timers.labyrinth = this.setupLabyrinth()
            if (this.settings.raids?.enabled) this.timers.raids = this.setupRaids()
            if (this.settings.abyss?.enabled) this.timers.abyss = this.setupAbyss()
            if (this.settings.trinkets?.enabled) this.timers.trinkets = this.setupTrinkets()
            // this.timers.refresh = this.setupRefresh()
            this.printTimers()
        }

        stop() {
            log('Stopping IQRPG Bot')
            for (const [key, val] of Object.entries(this.timers)) {
                log('Clearing interval:', key, val)
                clearInterval(val)
            }
            this.timers = {}
            this.inventory = {}
            this.taskQueue = []
            this.completed = {}

            for (const [key, val] of Object.entries(this.eventListeners.window)) {
                window.removeEventListener(key, val)
            }
            this.eventListeners.window = {}
        }

        restart() {
            this.stop()
            this.start()
        }
    }

    const charName = await getCharName()
    log('Character:', charName)
    unsafeWindow.bot = new IQRPGBot(defaultSettings, charSettings[charName])
    unsafeWindow.addEventListener('beforeunload', () => unsafeWindow.bot.stop())
    unsafeWindow.bot.start()
})()
