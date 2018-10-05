'use strict';

// Template for coffee order.
Cafe.COFFEE_TEMPLATE = 
  '<div class="row">' +
    '<div class="col">' +
      '<button type="button" class="btn btn-outline-danger" name="hot" hidden>Hot</button>' +
      '<button type="button" class="btn btn-info" name="iced" hidden>Iced</button>' +   
    '</div>' +
    '<div class="col">' +
      '<div class="input-group mb-3">' +
        '<div class="input-group-prepend" id="button-addon3">' +
          '<button class="btn btn-outline-secondary" type="button" name="minus">-</button>' +
        '</div>' +
        '<input type="text" class="form-control" style="text-align:center;" placeholder="" value="1" name="quantity" disabled>' +
        '<div class="input-group-append" id="button-addon3">' +
          '<button class="btn btn-outline-secondary" type="button" name="plus">+</button>' +
        '</div>' +
      '</div>' +
    '</div>' +
  '</div>' +

  '<div class="row">' +
    '<div class="col">' +
      '<div class="dropdown">' +
        '<button class="btn btn-outline-dark dropdown-toggle btn-block btn-lg" type="button" name="menu" data-toggle="dropdown"></button>' +
        '<div class="dropdown-menu" aria-labelledby="dropdownMenuButton">' +
          '<a class="dropdown-item" href="#">Americano</a>' +
          '<a class="dropdown-item" href="#">Caramel Macchiato</a>' +
          '<a class="dropdown-item" href="#">Latte</a>' +
          '<a class="dropdown-item" href="#">Chocolate(S)</a>' +
          '<a class="dropdown-item" href="#">Vanilla Latte</a>' +
          '<a class="dropdown-item" href="#">Chocolate(L)</a>' +
          '<a class="dropdown-item" href="#">Cappucino</a>' +
          '<a class="dropdown-item" href="#">Espresso</a>' +
          '<a class="dropdown-item" href="#">Tea</a>' +
          '<a class="dropdown-item" href="#">Other</a>' +
        '</div>' +
      '</div>' +
    '</div>' +
  '</div>' +

  '<div class="row">' + '<div class="col">' + '<div class="input-group mb-3">' + '</div>' + '</div>' +

  '<div class="row">' +
    '<div class="col">' +
      '<div class="input-group mb-3 input-group-lg">' +
        '<div class="input-group-prepend">' +
          '<span class="input-group-text">+@</span>' +
        '</div>' +
        '<input type="text" class="form-control" placeholder="Comments" name="option">' +
      '</div>' +
    '</div>' +
  '</div>' + 
  '<div class="row">' + '<div class="col">' + '<div class="input-group mb-3">' + '</div>' + '</div>' +
  '<div class="row">' + '<div class="col">' + '<div class="input-group mb-3">' + '</div>' + '</div>'; 

// Initializes Cafe
function Cafe() {
  this.checkSetup();

  this.initFirebase();
  this.initLedger();
  this.initButtons();
}

// Sets up shortcuts to Firebase features and initiate firebase auth.
Cafe.prototype.initFirebase = function() {
  // Shortcuts to Firebase SDK features.
  this.auth = firebase.auth();
  this.database = firebase.database();
  // Initiates Firebase auth and listen to auth state changes.
  //this.auth.onAuthStateChanged(this.onAuthStateChanged.bind(this));
  this.timer = moment().tz('America/Los_Angeles');
};

Cafe.prototype.initLedger = function() {
  const dbName = 'cafe/' + this.timer.format('YYYYMMDD');

  this.cafeLedger = this.database.ref(dbName);
  this.cafeOrderId = this.database.ref(dbName + '/lastOrderId');
  this.cafeOrderLedger = id => this.database.ref(dbName + '/orderList/' + id);
  
};

Cafe.prototype.initButtons = function() {
  this.orderButton = document.getElementById('order');
  this.addCoffeeButton = document.getElementById('addCoffee');
  this.nameInput = document.getElementById('name');

  this.orderButton.addEventListener('click', this.orderCoffee.bind(this));
  this.addCoffeeButton.addEventListener('click', this.addCoffee.bind(this));

  // initialize first item
  this.addCoffee();
};

Cafe.prototype.orderCoffee = function() {
  const name = document.querySelector('#name').value;

  if (!name) {
    alert('Please put your name!');
    return;
  }

  let orderList = []

  document.querySelectorAll('[name=coffee-order-list]').forEach((div) => {
    const isIced = div.querySelector('[name=iced]').getAttribute('hidden') !== 'true';
    const quantity = parseInt(div.querySelector('[name=quantity]').value);
    const coffeeMenu = div.querySelector('[name=menu]').innerText;
    const option = div.querySelector('[name=option]').value;

    if (quantity)
      orderList.push({
        isIced: isIced,
        quantity: quantity,
        menu: coffeeMenu,
        option: option,
        state: 'pending'
      });
  });

  if (!orderList.length) {
    alert('Please order coffee!');
    return;
  }

  this.orderButton.setAttribute('disabled', 'true');

  this.cafeOrderId.transaction(orderId => {
    if (null === orderId)
      return 1;
    
    return orderId + 1;

  }, (err, committed, snapshot) => {
    if (err || !committed) {
      alert('Please refresh the page and order again');
      return;
    }

    const orderId = snapshot.val();

    this.cafeOrderLedger(orderId).set(
      {
        name: name,
        id: orderId,
        order: orderList,
        time: {
          start: this.timer.format('YYYYMMDD HH:mm:ss')
        }
      }
    ).then((() => {
      window.location.replace('/order/' + orderId);
    }).bind(this)).catch((err) => {
      console.error('Error writing new order to Firebase Database', err);
    });
  });
};

Cafe.prototype.addCoffee = function() {
  const div = document.createElement('div');
  const container = document.querySelector('#coffee-container');

  div.setAttribute('class', 'container');
  div.setAttribute('name', 'coffee-order-list');
  div.innerHTML = Cafe.COFFEE_TEMPLATE;
  container.insertBefore(div, container.firstChild);

  const icedButton = div.querySelector('[name=iced]');
  const hotButton = div.querySelector('[name=hot]');
  const minusButton = div.querySelector('[name=minus]');
  const plusButton = div.querySelector('[name=plus]');
  const quantityInput = div.querySelector('[name=quantity]');
  const coffeeMenu = div.querySelector('[name=menu]');
  const coffeeList = div.querySelectorAll('.dropdown-item');

  const toggleListener = () => {
    if ('true' === icedButton.getAttribute('hidden')) {
      icedButton.removeAttribute('hidden');
      hotButton.setAttribute('hidden', 'true');
    } else {
      hotButton.removeAttribute('hidden');
      icedButton.setAttribute('hidden', 'true');
    }
  };

  icedButton.addEventListener('click', toggleListener);
  hotButton.addEventListener('click', toggleListener);
  toggleListener();

  minusButton.addEventListener('click', () => {
    const value = parseInt(quantityInput.value);
    if (value > 0) {
      quantityInput.value = value - 1;
    }
  });

  plusButton.addEventListener('click',() => {
    const value = parseInt(quantityInput.value);
    quantityInput.value = value + 1;
  });

  coffeeMenu.addEventListener('click', () => {
    this.yScroll = window.pageYOffset;
    console.log(1, window.pageYOffset);
  });

  coffeeList.forEach((i) => {
    i.addEventListener('click', (e) => {
      coffeeMenu.innerText = i.innerText;
    });
  });

  coffeeList[0].dispatchEvent(new CustomEvent('click'));
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
