// ==UserScript==
// @name         CatWar Shield Indicator
// @namespace    https://catwar.su/
// @version      1.0
// @description  Показывает иконку щита над персонажем при активном блоке.
// @author       shyless
// @match        https://catwar.su/*
// @match        https://catwar.net/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_getResourceURL
// @resource     shieldIcon data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0iI0MwMzkyQiIgc3Ryb2tlPSIjRkZGIiBzdHJva2Utd2lkdGg9IjEuNSIgZD0iTTEyIDEgTDMgNSB2NiBjMCA1LjUgMy44IDEwLjUgOSAxMiA1LjItMS41IDktNi41IDktMTIgVjUgTDEyIDF6Ii8+PC9zdmc+
// ==/UserScript==

(function() {
    'use strict';

    // ---------- 1. Определение ID игрока ----------
    const ID_KEY = 'playerId';

    function savePlayerId() {
        const idEl = document.querySelector('b#id_val');
        if (idEl) {
            const id = idEl.textContent.trim();
            if (/^\d+$/.test(id)) {
                GM_setValue(ID_KEY, id);
                console.log('[Shield] ID сохранён:', id);
            }
        }
    }

    // При первом запуске на любой странице пытаемся сохранить ID
    savePlayerId();

    // ---------- 2. Загрузка иконки ----------
    let shieldIconUrl = null;
    try {
        // GM_getResourceURL в Tampermonkey, GM.getResourceUrl в Greasemonkey
        const getRes = typeof GM_getResourceURL === 'function' ? GM_getResourceURL : GM.getResourceUrl;
        shieldIconUrl = getRes('shieldIcon');
    } catch (e) {
        console.error('[Shield] Не удалось получить ресурс иконки:', e);
    }

    if (!shieldIconUrl) {
        console.warn('[Shield] Иконка щита не загружена. Проверьте @resource.');
    }

    // ---------- 3. Логика на странице /cw3 ----------
    if (!location.pathname.startsWith('/cw3')) {
        // Не игровая страница – только сохранили ID, дальше ничего не делаем
        return;
    }

    const playerId = GM_getValue(ID_KEY, null);
    if (!playerId) {
        console.warn('[Shield] ID игрока не найден. Зайдите в "Мой кот", чтобы скрипт его запомнил.');
        return;
    }

    const ARROW_ID = `arrow${playerId}`;

    // Функция проверки состояния блока
    function isBlockActive() {
        const blockImg = document.querySelector('img#block');
        if (!blockImg) return false;
        return !blockImg.src.endsWith('unlock.png');
    }

    // Создаём элемент иконки
    const shieldImg = document.createElement('img');
    if (shieldIconUrl) {
        shieldImg.src = shieldIconUrl;
    }
    shieldImg.classList.add('shield-indicator');
    shieldImg.style.cssText = `
        position: absolute;
        top: 5%;
        right: 10%;
        width: 40%;
        height: auto;
        object-fit: contain;
        pointer-events: none;
        z-index: 100;
        opacity: 0.9;
    `;

    // Найти контейнер для иконки (div.d внутри span.catWithArrow с нашей стрелкой)
    function getContainer() {
        const arrow = document.getElementById(ARROW_ID);
        if (!arrow) return null;
        const span = arrow.closest('span.catWithArrow');
        if (!span) return null;
        return span.querySelector('div.d');
    }

    // Обновление отображения иконки
    function updateShield() {
        const active = isBlockActive();
        const container = getContainer();

        // Удаляем иконку, если она не в нужном контейнере
        if (shieldImg.parentNode && shieldImg.parentNode !== container) {
            shieldImg.remove();
        }

        if (active && container) {
            if (!shieldImg.parentNode) {
                container.appendChild(shieldImg);
            }
        } else {
            if (shieldImg.parentNode) {
                shieldImg.remove();
            }
        }
    }

    // Следим за изменением src у img#block
    function observeBlock() {
        const blockImg = document.querySelector('img#block');
        if (!blockImg) {
            setTimeout(observeBlock, 500);
            return;
        }
        const observer = new MutationObserver((mutations) => {
            for (const m of mutations) {
                if (m.type === 'attributes' && m.attributeName === 'src') {
                    updateShield();
                }
            }
        });
        observer.observe(blockImg, { attributes: true, attributeFilter: ['src'] });
    }

    // Периодическая проверка на всякий случай
    setInterval(updateShield, 500);

    // Старт после загрузки страницы
    window.addEventListener('load', () => {
        observeBlock();
        updateShield();
    });

    // Также сразу попробуем, если DOM уже готов
    if (document.readyState === 'interactive' || document.readyState === 'complete') {
        observeBlock();
        updateShield();
    }
})();
