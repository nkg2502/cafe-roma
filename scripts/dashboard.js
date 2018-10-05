'use strict';

const PREV_STATE = {
  'making': 'pending',
  'done': 'making',
  'cancel': 'making'
};

const NEXT_STATE = {
  'pending': 'making',
  'making': 'done'
};

Cafe.NEXT_BUTTON_TEMPLATE = '<button type="button" class="btn btn-outline-primary" name="next-button"></button>';
Cafe.CANCEL_BUTTON_TEMPLATE = '<button type="button" class="btn btn-danger btn-sm" name="cancel-button">X</button>';

Cafe.ORDER_LIST_TEMPLATE = 
  '<table class="table table-striped">' +
    '<thead>' +
      '<tr>' +
        '<th>Order #</th>' +
        '<th name="order-number"></th>' +
        '<th colspan="3" name="order-name"></th>' +
        '<th name="order-time"></th>' +
      '</tr>' +
    '</thead>' +
    '<thead>' +
      '<tr>' +
        '<th scope="col"></th>' +
        '<th scope="col"></th>' +
        '<th scope="col"></th>' +
        '<th scope="col"><button type="button" class="btn btn-outline-warning btn-sm" name="done-all">Done</button></th>' +
        '<th scope="col"><button type="button" class="btn btn-outline-success btn-sm" name="making-all">Making</button></th>' +
        '<th scope="col"><button type="button" class="btn btn-outline-danger btn-sm" name="cancel-all">X</button></th>' +
      '</tr>' +
    '</thead>' +
    '<thead>' +
      '<tr>' +
        '<th scope="col"></th>' +
        '<th scope="col">Coffee</th>' +
        '<th scope="col">#?</th>' +
        '<th scope="col">State</th>' +
        '<th scope="col">Next?</th>' +
        '<th scope="col">Cancel</th>' +
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
  this.auth = firebase.auth();
  this.database = firebase.database();
};

Cafe.prototype.initLedger = function() {
  const dbName = 'cafe/' + moment().tz('America/Los_Angeles').format('YYYYMMDD');

  this.cafeLedger = this.database.ref(dbName);
  this.cafeOrderId = this.database.ref(dbName + '/lastOrderId');
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
    
    const candidate = data.order.filter((e) => (e.state !== 'done') && (e.state !== 'cancel'));
    if (!candidate.length)
      return;

    const orderDisplay = document.querySelector('#order-display');

    const orderTable = document.createElement('div');
    orderTable.setAttribute('class', 'table-responsive');
    orderTable.innerHTML = Cafe.ORDER_LIST_TEMPLATE;

    orderTable.querySelector('[name=order-number]').innerText = data.id;
    orderTable.querySelector('[name=order-name]').innerText = data.name;

    const elapsed = orderTable.querySelector('[name=order-time]');
    setInterval(() => {
      const startTime = moment(data.time.start, 'YYYYMMDD HH:mm:ss');
      const duration = moment.duration(moment().diff(startTime));
      elapsed.innerText = duration.minutes() + ':' + duration.seconds();
    }, 1000);

    orderDisplay.appendChild(orderTable);

    orderTable.querySelector('[name=done-all]').addEventListener('click', () => {
      for (let i = 0; i < data.order.length; ++i)
        this.database.ref(dbName + '/orderList/' + data.id + '/order/' + i + '/state').set('done');
    });

    orderTable.querySelector('[name=making-all]').addEventListener('click', () => {
      for (let i = 0; i < data.order.length; ++i)
        this.database.ref(dbName + '/orderList/' + data.id + '/order/' + i + '/state').set('making');
    });

    orderTable.querySelector('[name=cancel-all]').addEventListener('click', () => {
      for (let i = 0; i < data.order.length; ++i)
        this.database.ref(dbName + '/orderList/' + data.id + '/order/' + i + '/state').set('cancel');
    });

    const menuList = orderTable.querySelector('[name=order-menu-list]');

    data.order.forEach((coffee, index) => {

      if (coffee.state === 'done' || coffee.state === 'cancel')
        return;

      const isIced = document.createElement('td');
      const menu = document.createElement('td');
      const quantity = document.createElement('td');
      const state = document.createElement('td');

      const nextButton = document.createElement('td');
      const cancelButton = document.createElement('td');

      nextButton.innerHTML = Cafe.NEXT_BUTTON_TEMPLATE;
      cancelButton.innerHTML = Cafe.CANCEL_BUTTON_TEMPLATE;

      const tr = document.createElement('tr');
      if (coffee.isIced)
        tr.setAttribute('class', 'table-primary');

      isIced.innerText = coffee.isIced ? "Iced" : "Hot";
      menu.innerText = coffee.menu + ' ' + coffee.option;
      quantity.innerText = coffee.quantity;
      state.innerText = coffee.state;

      nextButton.firstChild.innerText = NEXT_STATE[coffee.state];

      nextButton.firstChild.addEventListener('click', () => {
        this.database.ref(dbName + '/orderList/' + data.id + '/order/' + index + '/state').set(NEXT_STATE[coffee.state]);
      });

      cancelButton.firstChild.addEventListener('click', () => {
        this.database.ref(dbName + '/orderList/' + data.id + '/order/' + index + '/state').set('cancel');
      });

      this.database.ref(dbName + '/orderList/' + data.id + '/order/' + index).on('child_changed', (snap) => {
        const v = snap.val();

        this.stat[PREV_STATE[v]] -= coffee.quantity;
        this.stat[v] += coffee.quantity;
        updateStatHandler(this.stat);

        if ('done' === v || 'cancel' === v) {
          tr.setAttribute('hidden', 'true');

          const itemSize = orderTable.querySelectorAll('[name=order-menu-list] > tr').length;
          const hiddenItemSize = orderTable.querySelectorAll('[name=order-menu-list] > [hidden=true]').length;

          // ready to serve
          if (itemSize == hiddenItemSize) {
            orderDisplay.removeChild(orderTable);
            this.database.ref(dbName + '/orderList/' + data.id + '/time/end').set(moment().format('YYYYMMDD HH:mm:ss'));
          }

        } else {
          state.innerText = v;
          nextButton.firstChild.innerText = NEXT_STATE[v];

          nextButton.firstChild.addEventListener('click', () => {
            this.database.ref(dbName + '/orderList/' + data.id + '/order/' + index + '/state').set(NEXT_STATE[v]);
          });
        }

      });

      tr.appendChild(isIced);
      tr.appendChild(menu);
      tr.appendChild(quantity);
      tr.appendChild(state);
      tr.appendChild(nextButton);
      tr.appendChild(cancelButton);


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

  this.cafeOrderLedger.on('child_added', snapshot => {
    const data = snapshot.val();
    if (null === data) {
      return;
    }

    if (data.order) {
      displayStatHandler(data);
      displayTableHandler(data);
    }
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
