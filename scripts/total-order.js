'use strict';

Cafe.ORDER_LIST_TEMPLATE = 
  '<table class="table table-striped">' +
    '<thead>' +
      '<tr>' +
        '<th>Order #</th>' +
        '<th><a name="order-number"></a></th>' +
        '<th colspan="2" name="order-name"></th>' +
        '<th name="order-time"></th>' +
      '</tr>' +
    '</thead>' +
    '<thead>' +
      '<tr>' +
        '<th scope="col"></th>' +
        '<th scope="col">Coffee</th>' +
        '<th scope="col">Comments</th>' +
        '<th scope="col">#?</th>' +
        '<th scope="col">State</th>' +
      '</tr>' +
    '</thead>' +
    '<tbody name="order-menu-list">' +
    '</tbody>' +
  '</table>';

// Initializes Cafe
function Cafe() {
  this.checkSetup();

  this.initFirebase();
  this.initLedger();
}

// Sets up shortcuts to Firebase features and initiate firebase auth.
Cafe.prototype.initFirebase = function() {
  // Shortcuts to Firebase SDK features.
  this.database = firebase.database();
};

Cafe.prototype.initLedger = function() {
  const dbName = 'cafe/' + moment().tz('America/Los_Angeles').format('YYYYMMDD');

  this.cafeLedger = this.database.ref(dbName);
  this.cafeOrderLedger = this.database.ref(dbName + '/orderList');

  this.cafeOrderLedger.off();

  this.stat = {
    total: 0,
    pending: 0,
    making: 0,
    cancel: 0,
    done: 0
  }

  const displayTableHandler = (data) => {
    const orderDisplay = document.querySelector('#order-display');

    const orderTable = document.createElement('div');
    orderTable.setAttribute('class', 'table-responsive');
    orderTable.innerHTML = Cafe.ORDER_LIST_TEMPLATE;

    orderTable.querySelector('[name=order-number]').innerText = data.id;
    orderTable.querySelector('[name=order-number]').setAttribute('href', '/order/' + data.id);
    orderTable.querySelector('[name=order-name]').innerText = data.name;

    const elapsed = orderTable.querySelector('[name=order-time]');
    setInterval(() => {
      const startTime = moment(data.time.start, 'YYYYMMDD HH:mm:ss');
      const duration = moment.duration(moment().diff(startTime));
      elapsed.innerText = duration.minutes() + ':' + duration.seconds();
    }, 1000);

    orderDisplay.appendChild(orderTable);

    const menuList = orderTable.querySelector('[name=order-menu-list]');

    data.order.forEach((coffee, index) => {

      const isIced = document.createElement('td');
      const menu = document.createElement('td');
      const option = document.createElement('td');
      const quantity = document.createElement('td');
      const state = document.createElement('td');

      const tr = document.createElement('tr');
      if (coffee.isIced)
        tr.setAttribute('class', 'table-primary');

      isIced.innerText = coffee.isIced ? "Iced" : "Hot";
      menu.innerText = coffee.menu;
      option.innerText = coffee.option
      quantity.innerText = coffee.quantity;
      state.innerText = coffee.state;

      tr.appendChild(isIced);
      tr.appendChild(menu);
      tr.appendChild(option);
      tr.appendChild(quantity);
      tr.appendChild(state);

      menuList.appendChild(tr);
    });
  };

  const updateStatHandler = (stat) => {
    const tr = document.createElement('tr');
    [stat.total, stat.pending, stat.making, stat.cancel, stat.done].map(e => {
      const td = document.createElement('td');
      td.innerText = e;
      return td;
    }).forEach(e => {
      tr.appendChild(e);
    });

    const statTable = document.querySelector('#stat');
    if (statTable.firstChild)
      statTable.removeChild(statTable.firstChild);

    document.querySelector('#stat').appendChild(tr);
  };

  const displayStatHandler = (data) => {
    this.stat = data.order.map((e) => [e.state, e.quantity]).reduce((stat, v) => {
      stat.total += v[1];
      stat[v[0]] += v[1];
      return stat;
    }, this.stat );

    updateStatHandler(this.stat);
  };

  this.cafeOrderLedger.once('value').then(snapshot => {
    const data = snapshot.val();
    if (null === data) {
      return;
    }

    data.reverse().forEach(e => {
      if (e.order) {
        displayStatHandler(e);
        displayTableHandler(e);
      }
    });
  });
};

// Checks that the Firebase SDK has been correctly setup and configured.
Cafe.prototype.checkSetup = function() {
  if (!window.firebase || !(firebase.app instanceof Function) || !firebase.app().options) {
    window.alert('You have not configured and imported the Firebase SDK. ' +
        'Make sure you go through the codelab setup instructions and make ' +
        'sure you are running the codelab using `firebase serve`');
  }
};

window.onload = function() {
  window.cafe = new Cafe();
};
