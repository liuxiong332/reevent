const { renderRegisterName, renderDispatchName, mainDispatchName, mainInitName, mainReturnName } = require('./constants');
const findIndex = require('lodash/findIndex');

module.exports = class ElectronMainClient {
  constructor(callbacks) {
    this.callbacks = callbacks;
    this.clients = {};
    this.clientInfos = [];
    window.isMainClient = true;

    window.addEventListener("message", (event) => {
      let callbacks = this.callbacks;
      let { action, data, invokeId, clientId } = event.data || {};
      if (action === renderDispatchName) {
        let result = callbacks.handleRendererMessage(data);
        this.clients[clientId].postMessage({
          action: mainReturnName,
          invokeId,
          data: result,
        }, '*');
      } else if (action === 'close') {       // Child window has closed
        let index = findIndex(this.clientInfos, (item) => item.clientId === clientId);
        if (index !== -1) this.clientInfos.splice(index, 1);
        this.clients[clientId] = null;
        callbacks.deleteWin(clientId);
      } else if (action === renderRegisterName) {
        let { filter } = data;
        callbacks.addWin(clientId);
        this.clientInfos.push({ clientId, filter });
        this.clients[clientId].postMessage({
          action: mainInitName,
          data: [callbacks.getInitStates(clientId), callbacks.getStores(clientId)],
        }, '*');
      }
    });

    this.addWin('mainClient', window);
  }
  
  addWin(clientId, newWin) {
    this.clients[clientId] = newWin;
  }

  getForwardClients() {
    return this.clientInfos;
  }

  sendToRenderer({ clientId }, payload) {
    let window = this.clients[clientId];
    window && window.postMessage({ action: mainDispatchName, data: payload }, '*');
  }

  closeAllWindows() {
    Object.keys(this.clients).forEach(clientId => {
      let window = this.clients[clientId];
      window && window.close();
    });
  }
}