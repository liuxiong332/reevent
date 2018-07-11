import StoreBase from 'event-flux/lib/StoreBase';
const { winManagerStoreName } = require('./constants');

function genBrowserUrl(url = '', clientId) {
  let genUrl = new URL(url, location.href);
  if (genUrl.search) {
    genUrl.search += `&clientId=${clientId}`;
  } else {
    genUrl.search = `?clientId=${clientId}`;
  }
  genUrl.search += '&isSlave=1';
  return genUrl.toString();
}

export default class MultiWinStore extends StoreBase {
  init() {
    this.stores[winManagerStoreName].observe((state) => {
      this.setState({ clientIds: state.clientIds });
    });
  }

  createWin(url, clientId) {
    clientId = clientId || this.genClientId();
    if (typeof window === 'object') {
      let win = this.createBrowserWin(genBrowserUrl(url, clientId));
      return this._appStore.mainClient.addWin(clientId, win);
    }
    return this.createElectronWin(url, clientId);
  }

  genClientId() {
    let clientId = 'win' + Math.floor(Math.random() * 10000);
    if (this.state.clientIds.indexOf(clientId) !== -1) {
      return this.genClientId();
    }
    return clientId;
  }

  closeAllWindows() {
    this._appStore.mainClient.closeAllWindows();
  }

  createBrowserWin(url) {
    return window.open(url);
  }

  createElectronWin(url, clientId) {
    console.error('Please provide the createElectronWin');
  }
}