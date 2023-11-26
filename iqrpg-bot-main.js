// ==UserScript==
// @name            IQRPG-Bot
// @namespace       http://tampermonkey.net/
// @version         0.2.0
// @description     try to take over the world!
// @author          mdrozdovz
// @match           https://*.avabur.com/game*
// @match           http://*.avabur.com/game*
// @icon            data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @require         https://cdn.jsdelivr.net/gh/lodash/lodash@4.17.4/dist/lodash.min.js
// @require         https://github.com/mdrozdovz/iqrpg-bot/raw/master/character-settings.js?v=8
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
        resourceWire: {
            enabled: false,
            checkIntervalSeconds: 3600,
            exceedFactor: 1.5,
            altsFactor: 0.5,
        }
    }

    const log = (msg, data) => {
        const now = new Date()
        const prefix = `[${now.toDateString()} ${now.toTimeString().split(' ')[0]}][IQRPG Bot]:`
        if (data) console.log(`${prefix} ${msg}`, data)
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

    const getCharName = () => {
        const nameSelector = () => $('td#my_title > a.profileLink')
        if (nameSelector()) return nameSelector().text
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
            inventory: () => $('a[href="/inventory"]'),
        },
        inventory: {
            jewels: () => $('div.menu > a[href="/inventory_jewels"]'),
            trinkets: () => $('div.menu > a[href="/inventory_trinkets"]'),
            resources: () => $$('div.menu > a:not([href])')
        },
        mainSection: {
            view: () => $('div.main-section > a:has([href])')
        }
    }
    const collectResources = async () => {
        const res = {}
        await safeClick(buttons.navigation.inventory())
        const btns = buttons.inventory.resources()
        for (const group of resourceGroups) {
            await safeClick(btns.shift())
            const rows = $$('table.table-invisible > tr')
            for (const row of rows) {
                const type = row.children[0].querySelector('p').textContent.replaceAll(/[\[\]]/g, '')
                const value = parseInt(row.children[1].textContent.replaceAll(',', ''))
                res[type] = value
            }
        }
        await safeClick(buttons.mainSection.view())
        return res
    }

    const closeModalSelector = () => $('#modalWrapper > div > span.closeModal')
    const confirmButtonSelector = () => $('#confirmButtons > a.button.green')
    const cancelButtonSelector = () => $('#confirmButtons > a.button.red')
    const chatInputSelector = () => $('div#chatMessage')
    const sendButtonSelector = () => $('input#chatSendMessage')

    const executeChatCommand = async cmd => {
        log('Executing command:', cmd)
        chatInputSelector().textContent = cmd
        await safeClick(sendButtonSelector())
    }

    class IQRPGBot {
        settings
        timers
        eventListeners

        constructor(defaultSettings, charSettings) {
            const settings = {}
            _.extend(settings, defaultSettings, charSettings)
            this.settings = settings
            this.timers = {}
            this.eventListeners = {}
        }

        setupQuestCompletion() {
            const infoLinkSelector = elem => elem.querySelector('div.center > a.questCenter')
            const completeButtonSelector = type => $(`input.completeQuest[data-questtype=${type}]`)
            const jumpFwdButtonSelector = () => $('#roaJumpNextMob')
            const beginQuestButtonsSelector = type => $(`input.questRequest[data-questtype=${type}]`)
            const resetStatsSelector = () => $('#clearBattleStats')
            const winRateSelector = () => $('td#gainsRatio')

            log('Setting up auto quest completion')
            return setInterval(async () => {
                const { elem, type } = getCurrentQuestType()
                if (!infoLinkSelector(elem)) return

                log(`Found completed quest. Current quest: ${type}`)

                await safeClick(completeButtonSelector(type))
                if (type === 'kill') {
                    if (winRateSelector()?.textContent === '100.00%') {
                        const { jumpForwardTimes } = this.settings.questCompletion
                        log(`Jumping mobs ${jumpForwardTimes} times`)
                        for (let i = 0; i < jumpForwardTimes; i++) {
                            await safeClick(jumpFwdButtonSelector())
                        }
                    }
                }
                await safeClick(beginQuestButtonsSelector(type))
                await safeClick(closeModalSelector())
                await safeClick(resetStatsSelector())
                log(`Refreshed quest`)
            }, this.settings.questCompletion.checkIntervalSeconds * 1000)
        }

        async wireToMain() {
            const mainChar = _.first(findCharsByRole(Role.Main))
            if (!this.settings.roles.includes(Role.Alt)) return

            const resData = this.resInfo(false)
            if (resData.factor > this.settings.resourceWire.exceedFactor) {
                const toWire = Math.floor(resData.primaryRss - resData.avg)
                const mats = resData.rss[Resource.CraftingMaterials]
                // TODO make universal, filterable
                const cmd = `/wire ${mainChar} ${toWire} ${resData.type}, ${mats} ${Resource.CraftingMaterials}`
                await executeChatCommand(cmd)
            }
        }

        async wireToAlts() {
            if (!this.settings.roles.includes(Role.Main)) return

            const alts = findCharsByRole(Role.Alt)
            const resInfo = this.resInfo().rss
            const min = _.min(Object.values(_.omit(resInfo, Resource.CraftingMaterials, Resource.GemFragments)))
            const toWire = Math.floor(min * this.settings.resourceWire.altsFactor / alts.length)

            for (const alt of alts) {
                let cmd = `/wire ${alt}`
                for (const type of [Resource.Food, Resource.Wood, Resource.Metal, Resource.Stone]) {
                    cmd += ` ${toWire} ${type},`
                }
                if (charSettings[alt].roles.includes(Role.Crafter)) {
                    cmd += ` ${resInfo[Resource.CraftingMaterials]} ${Resource.CraftingMaterials}`
                }
                cmd = cmd.replace(/,$/g, '')
                await executeChatCommand(cmd)
                await delay(5000)
            }
        }

        setupResourceWire() {
            return setInterval(this.wireToMain.bind(this), this.settings.resourceWire.checkIntervalSeconds * 1000)
        }

        async resInfo() {
            const rss = await collectResources()
            /*const type = this.settings.resource
            if (type) {
                const avg = _.sum(Object.values(_.omit(rss, Resource.CraftingMaterials, Resource.GemFragments))) / 4
                const primaryRss = rss[type]
                const factor = primaryRss / avg
                return { type, primaryRss, avg, factor, rss }
            } else {
                return { type, primaryRss: 0, avg: 0, factor: 1, rss }
            }*/
            console.log(rss)
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
            $('#areaContent').style.height = '440px'
            $('#chatMessageListWrapper').style.height = '510px'
            setTimeout(() => $('#close_general_notification').click(), 5000)
        }

        printTimers() {
            for (const [key, val] of Object.entries(this.timers)) {
                log(`timers.${key}: ${val}`)
            }
        }

        start() {
            log('Starting IQRPG Bot with settings:', this.settings)

            if (this.settings.questCompletion?.enabled) this.timers.questCompletion = this.setupQuestCompletion()
            if (this.settings.resourceWire?.enabled) this.timers.resourceWire = this.setupResourceWire()
            this.attachKeyBinds()
            this.miscellaneous()

            this.printTimers()
        }

        stop() {
            log('Stopping IQRPG Bot')
            for (const [key, val] of Object.entries(this.timers)) {
                clearInterval(val)
            }
            this.timers = {}

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

    unsafeWindow.bot = new IQRPGBot(defaultSettings, charSettings[getCharName()])
    unsafeWindow.addEventListener('beforeunload', () => unsafeWindow.bot.stop())
    unsafeWindow.bot.start()
})()
