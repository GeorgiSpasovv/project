
var socket = null;

//Prepare game
var app = new Vue({
    el: '#game',
    data: {
        chatmessage: '',

        state: { state: false },
        players: {},

        me: { name: '', state: 0, favourites: [] },
        page: 1,
        username: '',
        password: '',
        error: null,
        sell: 'WBNB',
        buy: 'ADA',
        BSC: {
            PancakeSwap: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
            ApeSwap: '0xcF0feBd3f17CEf5b47b0cD257aCf6025c5BFf3b7',
            MDEX: '0x7DAe51BD3E3376B8c7c4900E9107f12Be3AF1bA8'
        },
        comp: false,
        success: null,
        tokens: [],
        results: [],
    },
    mounted: function () {
        connect();
    },
    methods: {

        login() {
            socket.emit('login', { username: this.username, password: this.password });
        },

        register() {
            socket.emit('register', { username: this.username, password: this.password });
        },

        logout() {
            socket.emit('logout');
        },

        update(data) {
            this.me.name = data.name;
            this.me.state = data.state;
            this.me.favourites = data.favourites;
            this.page = data.page;
            this.username = '';
            this.password = '';
        },

        setSell(token) {
            this.sell = token;
        },

        setBuy(token) {
            this.buy = token;
        },

        compare(boo) {
            //this.comp = boo;

            socket.emit('compare', { from: this.sell.address, to: this.buy.address, decimals: this.buy.decimals });
        },

        addfav(token) {
            socket.emit('addfav', token);
        },

        getFav() {
            socket.emit('getfav');
        },



        admin(command) {
            socket.emit('admin', command)
        },
        action() {
            socket.emit('action', 'advance');
        },
        join() {
            socket.emit('join');
        },
        chat() {
            socket.emit('chat', this.chatmessage);
            this.chatmessage = '';
        },
        announce(message) {
            const messages = document.getElementById('messages');
            var item = document.createElement('li');
            item.textContent = message;
            messages.prepend(item);
        },

        fail(message) {
            this.error = message;
            setTimeout(clearError, 3000);
            setTimeout(clearSuccess, 3000);
        },
        capitalise(text) {
            return text.charAt(0).toUpperCase() + text.slice(1);
        },
        pageChange(page) {
            this.page = page;
        }
    }
});

function clearError() {
    app.error = null;
}

function clearSuccess() {
    app.success = null;
}

function connect() {
    //Prepare web socket
    socket = io();

    socket.on('connect', function () {
        app.state.state = 0;
    });

    socket.on('connect_error', function (message) {
        alert('Unable to connect: ' + message);
    });

    socket.on('disconnect', function () {
        alert('Disconnected');
        app.state = { state: -1 };
    });

    socket.on('fail', function (message) {
        app.fail(message);
    });

    socket.on('state', function (data) {
        app.update(data);
    });

    socket.on('chat', function (message) {
        app.announce(message);
    });

    socket.on('auth', function (data) {
        app.update(data);
    });

    socket.on('success', function (data) {
        app.success = data;
        app.fail(null);
    });

    socket.on('tokens', function (data) {
        app.tokens = data;
    });

    socket.on('fav', function (data) {
        app.me.favourites = data;
        app.pageChange(4);
    });

    socket.on('result', function (data) {
        app.results = data;
        this.comp = true;
    });
}
