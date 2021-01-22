const WebSocket = require('ws');
const moment = require('moment');
const request = require('request');
const crypto = require('crypto');
const Ticker = require('../dict/ticker');
const TickerEvent = require('../event/ticker_event');

module.exports = class Poloniex {
  constructor(eventEmitter, requestClient, candlestickResample, logger, queue, candleImporter, throttler) {
    this.eventEmitter = eventEmitter;
    this.logger = logger;
    this.queue = queue;
    this.candleImporter = candleImporter;
    this.requestClient = requestClient;
    this.throttler = throttler;

    this.apiKey = undefined;
    this.apiSecret = undefined;
    this.tickSizes = {};
    this.lotSizes = {};

    this.positions = {};
    this.orders = {};
    this.tickers = {};
    this.symbols = [];
    this.intervals = [];
  }

  start(config, symbols) {
    const { eventEmitter } = this;

    this.symbols = symbols;

    const ws = new WebSocket('wss://api2.poloniex.com');

    const me = this;
    ws.onopen = function() {
      me.logger.info('Poloniex: Connection opened.');
    };

    symbols.forEach(symbol => {
      ws.send(JSON.stringify({ command: 'subscribe', channel: symbol.symbol }));
    });

    if (config.key && config.secret && config.key.length > 0 && config.secret.length > 0) {
      me.logger.info('Poloniex: sending auth request');
      me.apiKey = config.key;
      me.apiSecret = config.secret;

      const payload = `nonce=${crypto.randomBytes(16).toString('base64')}`;
      const signature = crypto
        .createHmac('sha512', config.secret)
        .update(payload)
        .digest('hex');

      const parameters = {
        command: 'subscribe',
        channel: 1000,
        key: config.key,
        payload,
        sign: signature
      };

      ws.send(JSON.stringify(parameters));
    }

    this.ws.onmessage = function(event) {
      if (event.data.length === 0) {
        return;
      }

      const data = JSON.parse(event.data);
      if ('error' in data) {
        me.logger.error(`Poloniex: error ${event.error}`);
        console.log(`Poloniex: error ${event.error}`);
      } else if (data[0] === 1000) {
        // Account notifications

        if (data[1] === 1) {
          me.logger.info('Poloniex: Auth successful');
          return;
        }
      } else if (data[0] === 1002) {
        // ticker

        if (!data[2]) {
          return;
        }

        data[2].forEach(instrument => {
          const symbol = symbols.;

          eventEmitter.emit(
            'ticker',
            new TickerEvent(
              me.getName(),
              symbol,
              (me.tickers[symbol] = new Ticker(me.getName(), symbol, moment().format('X'), bid, ask))
            )
          );
        });
      }
    };

    this.ws.onclose = function(event) {
      //   const { type, wasClean, reason, code } = event;
      // this.ws = null;
    };
  }

  getName() {
    return 'poloniex';
  }
};
