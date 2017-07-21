const concatnl = (...messages) => messages.map(m => `\t${m}\n`).join('');
const div = content => $('<div></div>').text(content);
const jqObjFromStr = idstring => $(`#${idstring}`);

const resizeCanvases = (parentCanvasId, canvasEleGroup) => {
    const parentEle = document.getElementById(parentCanvasId);
    const w = parentEle.offsetWidth;
    const h = parentEle.offsetHeight;

    for (const c of canvasEleGroup) {
        c.width = w;
        c.height = h;
    }
};

const containerCanvasId = 'container-canvas';

const canvasLayerIds = [
    'static-canvas', 'dynamic-canvas', 'label-canvas'
];

const tickrate = 1000 / 2;

$(document).ready(() => {
    const socket = io.connect(window.location.origin, {
        'reconnection': false
    });

    const spriteCache = new SpriteCache();

    const staticCanvas = document.getElementById(canvasLayerIds[0]);
    const dynamicCanvas = document.getElementById(canvasLayerIds[1]);
    const labelCanvas = document.getElementById(canvasLayerIds[2]);

    const canvasGroup = [staticCanvas, dynamicCanvas, labelCanvas];

    resizeCanvases(containerCanvasId, canvasGroup);

    const staticCtx = staticCanvas.getContext('2d');
    const dynamicCtx = dynamicCanvas.getContext('2d');
    const labelCtx = labelCanvas.getContext('2d');

    const table = new Table(9, staticCanvas, labelCanvas);

    const player = new Player(
        Player.assignGuestName(),
        socket ? socket.id : -100,
        500
    );

    let seatindex = 0;

    while (seatindex < table.maxseats) {
        table.emptySeat(seatindex);
        table.seat(seatindex).drawOnNextUpdate = true;
        seatindex += 1;
    }

    table.drawOnNextUpdate = true;

    const $containerbetting = $('#container-betting');
    const $containerturnactions = $('#container-turn-actions');
    const $bettextfield = $('#bet-amount-text-field');
    const $betrangeslider = $('#bet-range-slider');
    const $betsubmitbutton = $('#bet-submit-bet-btn');

    $betrangeslider.on('change', () => {
        const slidervalue = $betrangeslider.val();
        $bettextfield.val(slidervalue);
    });

    const onsit = (data) => {
        player.gameid = data.gameId;

        const result = table.sit(data.seatIndex, player);

        if (result) {
            player.takeSeatAt(table, data.seatIndex);

            Promise.resolve().then(() => {
                table.messageHistory.push('waiting for players ...');
                table.drawOnNextUpdate = true;
            });
        }

        socket.emit('player-ready', { seated: result });
    };

    const oncardsdealt = (data) => {
        player.gotHand(data.cards.a, data.cards.b);
    };

    socket.emit('joined-table', { name: player.name, balance: player.balance });

    socket.on('player-seated', onsit);
    socket.on('cards-dealt', oncardsdealt);

    let renderLoop = null;

    setTimeout(() => { // start
        console.log('debug: entered start ...');
        console.log('debug: ... exited start ...');
    }, 1500);

    setTimeout(() => { // update
        console.log('debug: ... started update ...');

        renderLoop = setInterval(() => {
            table.render();
        }, tickrate, table, staticCanvas);

        console.log('debug: ... updating running ...');
    }, 3000);

    setTimeout(() => { // debug
        console.log('debug ... executing statements with debug data ...');

        console.log('call the oncardsdealt callback');

        oncardsdealt({
            cards: {
                a: { value: 5, suite: 0 },
                b: { value: 8, suite: 2 }
            }
        });

        console.log('debug ... finished executing statements with debug data ...');
    }, 3500);

    $(window).on('resize', () => {
        resizeCanvases(containerCanvasId, canvasGroup);

        table.drawOnNextUpdate = true;

        for (const [si, so] of table.seats) {
            so.drawOnNextUpdate = true;
        };
    });
});