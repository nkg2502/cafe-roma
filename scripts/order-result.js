'use strict';

const isFinished = s => {
  return s === 'done' || s === 'cancel';
};

// Initializes Cafe
function Cafe() {
  this.checkSetup();

  this.initFirebase();
  this.initLedger();
  this.initButtons();
}

// Sets up shortcuts to Firebase features and initiate firebase auth.
Cafe.prototype.initFirebase = function() {
  this.database = firebase.database();
};

Cafe.prototype.initLedger = function() {
  const id = window.location.pathname.split('/').pop();
  const dbName = 'cafe/' + moment().tz('America/Los_Angeles').format('YYYYMMDD');
  const cafeOrderLedgerName = dbName + '/orderList/' + id;

  this.cafeOrderLedger = this.database.ref(cafeOrderLedgerName);
  this.cafeOrderLedger.off();

  this.cafeOrderLedger.once('value').then(snapshot => {
    const data = snapshot.val();

    if (null === data) {
      alert('There is No order #' + id);
      window.location.replace('/');
      return;
    }

    document.querySelector('#number').innerText = 'Order #' + id;
    document.querySelector('#order-name').innerText = data['name'];

    const timer = document.querySelector('#time');
    const startTime = moment(data['time']['start'], 'YYYYMMDD HH:mm:ss');

    const timerId = setInterval(() => {
      const duration = moment.duration(moment().diff(startTime));
      timer.innerText = startTime.format('MM/DD HH:mm:ss') + ' (' + duration.minutes() + ':' + duration.seconds() + ')';
    }, 1000);

    data.order.forEach((e, i) => {
      const isIced = document.createElement('td');
      const menu = document.createElement('td');
      const quantity = document.createElement('td');
      const state = document.createElement('td');

      isIced.innerText = e.isIced ? 'Iced' : 'Hot';
      menu.innerText = e.menu + ' ' + e.option;
      quantity.innerText = e.quantity;
      state.innerText = e.state;

      const tr = document.createElement('tr');

      tr.appendChild(isIced);
      tr.appendChild(menu);
      tr.appendChild(quantity);
      tr.appendChild(state);

      document.querySelector('#order-list').appendChild(tr);

      this.database.ref(cafeOrderLedgerName + '/order/' + i).on('child_changed', snap => {
        state.innerText = snap.val();
      });

    });

    if (data.time.end) {
      clearInterval(timerId);
      timer.innerText = 'Please grab your coffee! ' + moment(data.time.end, 'YYYYMMDD HH:mm:ss').format('MM/DD HH:mm');
    }

    this.database.ref(dbName + '/orderList/' + id + '/time').on('child_changed', snap => {
      clearInterval(timerId);
      alert('Please grab your coffee!');
      timer.innerText = 'Please grab your coffee! ' + moment(snap.val(), 'YYYYMMDD HH:mm:ss').format('MM/DD HH:mm');
    });
  });
};

Cafe.prototype.initButtons = function() {
  document.querySelector('#back').addEventListener('click', () => {
    window.location.replace('/order');
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
