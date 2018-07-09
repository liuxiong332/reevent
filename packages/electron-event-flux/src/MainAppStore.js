import AppStore from 'event-flux/lib/AppStore';
const { globalName, winManagerStoreName, winManagerKey, } = require('./constants');
const objectDifference = require('./utils/object-difference');
const fillShape = require('./utils/fill-shape');
const isEmpty = require('lodash/isEmpty');
const isObject = require('lodash/isObject');
const { serialize, deserialize } = require('json-immutable');
const { filterOneStore, filterWindowStore, filterWindowState, filterWindowDelta } = require('./utils/filter-store');
const { declareStore } = require('./StoreDeclarer');
import MultiWinManagerStore, { WinPackStore } from './MultiWinManagerStore';
const MainClient = typeof window !== 'object' ? require('./ElectronMainClient') : require('./BrowserMainClient');

function findStore(stores, storePath) {
  return storePath.reduce((subStores, entry) => {
    console.log(subStores, entry)
    if (!isObject(entry)) return subStores[entry]
    let { name, type, index } = entry;
    let storeCol = subStores[name];
    if (type === 'List' || type === 'Map') {
      return storeCol.get(index);      
    }
  }, stores);
}

function storeEnhancer(appStore, stores, storeShape) {
  const callbacks = {
    addWin(clientId) {
      stores[winManagerStoreName].addWin(clientId);
    },
    deleteWin(clientId) {
      stores[winManagerStoreName].deleteWin(clientId);
    },
    getStores(clientId) {
      let stores = filterWindowStore(storeShape, winManagerStoreName, clientId);
      return JSON.stringify(stores);
    },
    getInitStates(clientId) {
      console.log('state:', clientId, appStore.state);
      let filterState = filterWindowState(appStore.state, winManagerKey, clientId);
      return serialize(filterState);
    },
    handleRendererMessage(payload) {
      const { store: storePath, method, args } = deserialize(payload);
      let store = findStore(stores, storePath);
      return JSON.stringify(store[method].apply(store, args));
    }
  }
  
  const mainClient = new MainClient(callbacks);
  appStore.mainClient = mainClient;
  const forwarder = (payload) => {
    // Forward all actions to the listening renderers
    let clientInfo = mainClient.getForwardClients();
    const util = require('util')
    console.log('all payload:', util.inspect(payload, {showHidden: false, depth: null}))

    clientInfo.forEach(client => {
      let { filter: shape, clientId } = client;
      let updated = fillShape(payload.updated, shape);
      let deleted = fillShape(payload.deleted, shape);
      [updated, deleted] = filterWindowDelta(updated, deleted, winManagerKey, clientId);

      if (isEmpty(updated) && isEmpty(deleted)) {
        return;
      }

      const action = { payload: { updated, deleted } };

      console.log(util.inspect(action, {showHidden: false, depth: null}))
      mainClient.sendToRenderer(client, JSON.stringify(action));
    });
  };
  return forwarder;
}

class MultiWindowAppStore extends AppStore {
  onWillChange(prevState, state) {
    const delta = objectDifference(prevState, state);
    if (isEmpty(delta.updated) && isEmpty(delta.deleted)) return;
    this.forwarder(delta);
  };

  init() {
    this.buildStores();
    this.initStores();
    this.startObserve();
    super.init();
    this.forwarder = storeEnhancer(this, this.stores, this.storeShape);
  }

  getStore(key) {
    return this.stores[key]
  }

  setStore(key, store) {
    return this.stores[key] = store;
  }

  dispose() {
    this.disposeStores();
    super.dispose();        
  }
}

export default function buildMultiWinAppStore(stores, winStores) {
  WinPackStore.innerStores = winStores;
  let allStores = {
    ...stores, 
    [winManagerKey]: declareStore(MultiWinManagerStore, { storeKey: winManagerStoreName }),
  };
  MultiWindowAppStore.innerStores = allStores;
  const storeShape = filterOneStore(MultiWindowAppStore, (instance) => instance.stores);
  const appStore = new MultiWindowAppStore();
  appStore.storeShape = storeShape;
  appStore.init();
  return appStore;
}