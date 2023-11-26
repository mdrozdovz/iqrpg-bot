// ==UserScript==
// @name            IQRPG-Bot
// @namespace       http://tampermonkey.net/
// @version         0.1.0
// @description     try to take over the world!
// @author          mdrozdovz
// @match           https://test.iqrpg.com/game*
// @match           http://test.iqrpg.com/game*
// @icon            data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @require         https://cdn.jsdelivr.net/gh/lodash/lodash@4.17.4/dist/lodash.min.js
// @require         https://github.com/mdrozdovz/iqrpg-bot/raw/master/character-settings.js?v=4
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
            rssAltsFactor: 0.5,
            goldAltsFactor: 0.75,
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
        labyrinth: {
            enabled: true,
            intervalSeconds: 3600
        },
        raids: {
            enabled: true,
            intervalSeconds: 3600
        },
    }

    const log = (msg, ...data) => {
        const now = new Date()
        const prefix = `[${now.toDateString()} ${now.toTimeString().split(' ')[0]}][IQRPG Bot]:`
        if (data) console.log(`${prefix} ${msg}`, ...data)
        else console.log(`${prefix} ${msg}`)
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
        land: {
            personnel: () => $('a[href*=personnel]'),
            raids: () => $('a[href*=raids]'),
            portals: () => $('a[href*=portals]'),
        },
        misc: {
            captchaClose: () => $('div.modal > div.close'),
            view: () => $('div.main-section>div>div>div>p>a[href]'),
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

    class IQRPGBot {
        settings
        timers
        eventListeners
        inventory
        taskQueue

        constructor(defaultSettings, charSettings) {
            const settings = {}
            _.extend(settings, defaultSettings, charSettings)
            this.settings = settings
            this.timers = {}
            this.eventListeners = { window: {}}
            this.inventory = {}
            this.taskQueue = []
        }

        async processQueue() {
            let task = this.taskQueue.shift()
            while (!!task) {
                log('Processing task:', task.name)
                await task.exec()
                log('Processed task:', task.name)
                task = this.taskQueue.shift()
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
                    const type = row.children[0].querySelector('p').textContent.replaceAll(/[\[\]]/g, '')
                    const value = parseInt(row.children[1].textContent.replaceAll(',', ''))
                    res[type] = value
                }
            }
            await safeClick(buttons.misc.view())
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

            log('Wiring to each alt gold, wood/metal/stone:', goldToWire, rssToWire)
            for (const alt of alts) {
                for (const type of [Resource.Resources.Wood, Resource.Resources.Metal, Resource.Resources.Stone]) {
                    await wireItem(alt, type, rssToWire)
                }
                await wireItem(alt, Resource.Currency.Gold, goldToWire)
            }

            log('Wiring dungeon keys')
            for (const dun of dungeoneers) {
                for (const type of Object.values(Resource.DungeonKeys)) {
                    const keysToWire = Math.floor(this.inventory[type] / dungeoneers.length)
                    await wireItem(dun, type, keysToWire)
                }
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

        async runLabyrinth() {
            await safeClick(buttons.navigation.labyrinth())
            await safeClick($('button'))
            await safeClick(buttons.misc.captchaClose())
            this.timers.labyrinthReward = setTimeout(async () => {
                await safeClick($('div.main-section__body > div > div > button')) // Claim rewards
                await safeClick($('div.main-section__body > div > div > a:not([href])')) // Close window
            }, 150 * 1000)
            await safeClick(buttons.misc.view())
        }

        async runRaid() {
            await safeClick(buttons.navigation.land())
            await safeClick(buttons.land.raids())

            const rows = [...$$('table.table-invisible > tr')]
            const row = rows[1]
            const btn = row.querySelector('td:nth-child(2) > div > a')
            if (btn && btn.innerText !== 'Get Rewards') {
                await safeClick(buttons.misc.view())
                return
            }
            await safeClick(btn)

            const raidsTable = _.last([...$$('table.table-invisible')])
            const raidBtn = _.last([... raidsTable.querySelectorAll('tr')])?.querySelector('td > a')
            await safeClick(raidBtn)
            await safeClick(buttons.misc.view())
        }

        setupTaskExecutor() {
            return setInterval(this.processQueue.bind(this), this.settings.taskExecutor.intervalSeconds * 1000)
        }

        setupInventoryUpdate() {
            const task = {
                name: 'Inventory update',
                exec: async () => this.inventory = await this.collectInventory()
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

        attachKeyBinds() {
            log('Setting up custom key binds')
            const keyDown = e => {
                const key = e.key
                switch (key) {
                    case 'Enter':
                        safeClick(confirmButtonSelector())
                        break
                    case 'Escape':
                        safeClick(cancelButtonSelector())
                        break
                }
            }
            window.addEventListener('keydown', keyDown)
            if (!this.eventListeners.window) this.eventListeners.window = {}
            this.eventListeners.window.keydown = keyDown
        }

        miscellaneous() {
            setTimeout(() => $('#close_general_notification').click(), 5000)
        }

        printTimers() {
            for (const [key, val] of Object.entries(this.timers)) {
                log(`timers.${key}: ${val}`)
            }
        }

        async start() {
            log('Starting IQRPG Bot with settings:', this.settings)


            log('Collecting inventory')
            this.inventory = await this.collectInventory()
            this.timers.inventoryUpdate = this.setupInventoryUpdate()
            this.timers.taskExecutor = this.setupTaskExecutor()
            if (this.settings.resourceWire?.enabled) this.timers.resourceWire = this.setupResourceWire()
            if (this.settings.alchemistWire?.enabled) this.timers.alchemistWire = this.setupAlchemistWire()
            if (this.settings.runeCrafterWire?.enabled) this.timers.runeCrafterWire = this.setupRuneCrafterWire()
            if (this.settings.jewelCrafterWire?.enabled) this.timers.jewelCrafterWire = this.setupJewelCrafterWire()
            if (this.settings.labyrinth?.enabled) this.timers.labyrinth = this.setupLabyrinth()
            if (this.settings.raids?.enabled) this.timers.raids = this.setupRaids()
            // this.attachKeyBinds()
            // this.miscellaneous()
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
