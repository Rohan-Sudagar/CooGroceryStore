// Function to add item to cart
function addToCart(button) {
    const productElement = button.parentElement;

    // Get product attributes
    const productId = productElement.getAttribute('data-id');
    const productName = productElement.getAttribute('data-name');
    const productPrice = productElement.getAttribute('data-price');
    const productImage = productElement.previousElementSibling?.getAttribute('data-image');

    // Validate inputs
    if (!productId || !productName || !productPrice || !productImage) {
        alert("Failed to add to cart: Missing product details.");
        return;
    }

    alert(`${productName} is added to the cart!`);

    // Retrieve or initialize cart
    let cart = getCart();
    const existingProductIndex = cart.findIndex(item => item.id === productId);

    if (existingProductIndex > -1) {
        cart[existingProductIndex].quantity += 1;
    } else {
        cart.push({
            id: productId,
            name: productName,
            price: parseFloat(productPrice),
            image: productImage,
            quantity: 1
        });
    }

    setCookie('cart', JSON.stringify(cart), 7);
    updateCartDisplay();
}

function getCart() {
    let cart = getCookie('cart');
    return cart ? JSON.parse(cart) : [];
}

function setCookie(name, value, days) {
    const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `${name}=${value};expires=${expires};path=/`;
}

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

function updateCartDisplay() {
    let cart = getCart();
    const cartItemsElement = document.getElementById("cartItemsBody");
    const paypalContainer = document.getElementById("paypal-button-container");

    cartItemsElement.innerHTML = "";

    if (cart.length === 0) {
        cartItemsElement.innerHTML = '<tr><td colspan="5" class="text-center">Your cart is empty</td></tr>';
        document.getElementById('totalAmount').textContent = '0.00';
        paypalContainer.style.display = 'none';
        return;
    }

    paypalContainer.style.display = 'block';
    let total = 0;

    cart.forEach(item => {
        const row = document.createElement('tr');

        const imgCell = document.createElement('td');
        const img = document.createElement('img');
        img.src = item.image;
        img.alt = item.name;
        img.style.width = '220px';
        img.style.height = '100px';
        imgCell.appendChild(img);

        const nameCell = document.createElement('td');
        nameCell.textContent = item.name;

        const priceCell = document.createElement('td');
        priceCell.textContent = `$${item.price.toFixed(2)}`;

        const quantityCell = document.createElement('td');
        const quantityInput = document.createElement('input');
        quantityInput.type = 'number';
        quantityInput.value = item.quantity;
        quantityInput.min = 1;
        quantityInput.classList.add("form-control");
        quantityInput.addEventListener('change', () => updateQuantity(item.id, quantityInput.value));
        quantityCell.appendChild(quantityInput);

        const deleteCell = document.createElement('td');
        const deleteButton = document.createElement('button');
        deleteButton.classList.add('btn', 'btn-danger');
        deleteButton.textContent = 'Delete';
        deleteButton.addEventListener('click', () => deleteItem(item.id));
        deleteCell.appendChild(deleteButton);

        row.appendChild(imgCell);
        row.appendChild(nameCell);
        row.appendChild(priceCell);
        row.appendChild(quantityCell);
        row.appendChild(deleteCell);

        cartItemsElement.appendChild(row);

        total += item.price * item.quantity;
    });

    document.getElementById('totalAmount').textContent = total.toFixed(2);
}

function updateQuantity(productId, quantity) {
    let cart = getCart();
    const productIndex = cart.findIndex(item => item.id === productId);
    if (productIndex > -1) {
        cart[productIndex].quantity = parseInt(quantity);
        setCookie('cart', JSON.stringify(cart), 7);
        updateCartDisplay();
    }
}

function deleteItem(productId) {
    let cart = getCart();
    cart = cart.filter(item => item.id !== productId);
    setCookie('cart', JSON.stringify(cart), 7);
    updateCartDisplay();
}

window.onload = function() {
    updateCartDisplay();
};


paypal.Buttons({
    createOrder: function (data, actions) {
        const cart = getCart();
        if (cart.length === 0) {
            alert('Your cart is empty. Please add items before checking out.');
            // Reject the order creation to prevent PayPal flow
            return Promise.reject(new Error('Cart is empty'));
        }

        const items = cart.map(item => ({
            name: item.name.length > 127 ? item.name.substring(0, 127) : item.name,
            unit_amount: {
                currency_code: "USD",
                value: item.price.toFixed(2)
            },
            quantity: item.quantity
        }));

        const totalAmount = cart.reduce((total, item) => {
            return total + (item.price * item.quantity);
        }, 0).toFixed(2);

        return actions.order.create({
            purchase_units: [{
                reference_id: 'cart123',
                amount: {
                    currency_code: "USD",
                    value: totalAmount,
                    breakdown: {
                        item_total: {
                            currency_code: "USD",
                            value: totalAmount
                        }
                    }
                },
                items: items
            }]
        });
    },

    onApprove: function (data, actions) {
        return actions.order.capture().then(function (details) {
            alert('Transaction completed by ' + details.payer.name.given_name + '!');
            setCookie('cart', JSON.stringify([]), 7); // Clear the cart cookie
            updateCartDisplay(); // Refresh UI cart display
        }).catch(function (err) {
            console.error('Capture failed:', err);
            alert('An error occurred while processing the payment. Please try again.');
        });
    },

    onCancel: function (data) {
        alert('Payment was canceled.');
    },

    /* onError: function (err) {
        console.error('PayPal error:', err);
        alert('An unexpected error occurred with PayPal. Please try again later.');
    } */
    onError: function (err) {
        console.error('PayPal error:', err);
        alert('An error occurred with the payment: ' + err.message);
    }
    

}).render('#paypal-button-container');

