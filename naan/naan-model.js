(function () {

    function rNOP( value ) {
        return value;
    }

    function r0( value ) {
        return Math.round( value );
    }

    function r5( value ) {
        var v = Math.round( value );
        v = v - v % 5;
        return v;
    }

    function rHalf( value ) {
        var rem = value % 1;
        if ( rem <= 0.25 ) {
            return Math.floor( value );
        }
        else if ( rem < 0.75 ) {
            return ( value > 1 ? Math.floor( value ) : "" ) + "\u00BD";
        }
        else {
            return Math.ceil( value );
        }
    }

    function rSmallBig( value ) {
        var rem = value % 1;

        if ( value < 1 ) {
            if ( rem < 0.6 ) {
                return 1 + " mensi";
            }
            else {
                return 1;
            }
        }
        else if ( rem <= 0.25 ) {
            return Math.floor( value );
        }
        else if ( rem <= 0.5 ) {
            return Math.floor( value ) + " větší";
        }
        else if ( rem < 0.75 ) {
            return Math.ceil( value ) + ' menší';
        }
        else {
            return Math.ceil( value );
        }


    }

    function Ingredient( ratio, base, unit, text, roundFn ) {

        this.ratio = ratio;
        this.base = base;
        this.unit = unit;
        this.text = text;
        this.roundFn = roundFn;
        this.checked = ko.observable( false );

        this.value = ko.pureComputed( function() {
            return this.ratio() * base;
        }, this );

        this.human = ko.pureComputed( function() {
            return this.roundFn === undefined ? this.value() : this.roundFn( this.value() );
        }, this );

        this.unitAndText = ko.pureComputed( function () {
            return this.unit + " " + this.text;
        }, this);

    }

    function Step() {

        var self = this;

        if ( arguments.length === 0 ) {
            this.done = ko.observable( false );
            this.toggle = function() {
                self.done( !self.done() );
            };
        }
        else {
            this.steps = arguments;
            this.done = ko.pureComputed( function() {
                var d = true;
                // We realy need to iterate stopping too soon would not
                // make ko listen to the observable
                _.each( this.steps, function(i) {
                    if ( i.done() === false ) {
                        d = false;
                    };
                } );
                return d;
            }, this );

            this.toggle = function() {
                var val = !this.done();
                _.each( this.steps, function(i) {
                    i.done( val );
                } );
            };

        }

    }

    function twoPlaces( val ) {
        return ( val < 10 ? "0" : "" ) + val;
    }

    function Timer( hours, minutes, seconds, alterText ) {

        this.duration = hours * 3600 + minutes * 60 + seconds;
        this.remains = ko.observable( this.duration );
        this.alterText = alterText;

        this.sTxt = ko.pureComputed( function() {
            var d = new Date( this.remains() * 1000 ).getSeconds();
            return twoPlaces( d );
        }, this );

        this.mTxt = ko.pureComputed( function() {
            var d = new Date( this.remains() * 1000 ).getMinutes();
            return twoPlaces( d );
        }, this );

        this.hTxt = ko.pureComputed( function() {
            return new Date( this.remains() * 1000 ).getHours() - 1;
        }, this );

        this.audio = new Audio( "naan/alarm.mp3" );

        this.done = ko.observable( false );

        this.icon = ko.pureComputed( function() {
            if ( this.remains() <= 0  ) {
                return 'alarm_off';
            }
            else {
                return 'alarm';
            }

        }, this );

        this.timer = ko.observable( false );

    }


    Timer.prototype.start = function() {
        this.st = new Date().getTime();

        var tick = _.bind( function() {
            var rem = this.duration - Math.round( ( new Date().getTime() - this.st ) / 1000 );
            if ( rem < 0 ) {
                rem = 0;
                this.audio.play();
            }
            this.remains( rem );
        }, this );

        this.timer( setInterval( tick, 500 ) );
    };

    Timer.prototype.stop = function() {
        clearInterval( this.timer() );
        this.timer( false );
        if ( this.remains() <= 0 ) {
            this.audio.pause();
            this.done( true );
        }
        this.remains( this.duration );
    };


    Timer.prototype.click = function() {

        if ( this.timer() === false ) {
            this.start();
        }
        else {
            this.stop();
        }
    };


    NaanModel = function () {

        this.base = 6;

        this.igVisible = ko.observable( true );
        this.pVisible = ko.observable( true );

        this.target = ko.observable(this.base);
        this.ratio = ko.pureComputed( function() {
            return ( this.target() / this.base );
        }, this );

        this.igShared = {
            cukr_1 : new Ingredient( this.ratio, 1, "lžičku", "cukru", rHalf ),
            cukr_2 : new Ingredient( this.ratio, 0.5, "lžičku", "cukru", rHalf ),
        };

        this.ingredientsMap = {

             mleko : new Ingredient( this.ratio, 100, "ml", "vlažného mléka", r5 ),
             drozdi : new Ingredient( this.ratio, 14, "g", "droždí", r0 ),
             cukr : new Ingredient( this.ratio, 1.5, "lžičky", "cukru", rHalf ),

             mouka : new Ingredient( this.ratio, 360, "g", "hladké mouky", r0 ),
             sul : new Ingredient( this.ratio, 2, "lžičky", "soli", rHalf ),
             pp : new Ingredient( this.ratio, 1, "lžičku", "prášku do pečiva", rHalf ),
             vejce : new Ingredient( this.ratio, 1, "", "vejce", rSmallBig ),
             maslo : new Ingredient( this.ratio, 2, "lžíce", "rozpuštěného másla", rHalf ),
             jogurt : new Ingredient( this.ratio, 100, "ml", "bílého jogurtu" , r5 )
        };

        this.ingredients = _.values( this.ingredientsMap );

        this.postup = {

            k_mleko : new Step(),
            k_drozdi : new Step(),
            k_cukr : new Step(),
            k_timer : new Timer( 0, 15, 0, "15 minut" ),

            t_mouka : new Step(),
            t_cukr : new Step(),
            t_sul : new Step(),
            t_pp : new Step(),

            t2_vejce : new Step(),
            t2_maslo : new Step(),
            t2_jogurt : new Step(),
            t2_kvasek : new Step(),

            t3 : new Step(),

            kyn_timer : new Timer( 1, 30, 0, "1 az 1 a \u00BD hodiny" ),

            td : new Step(),
            pec : new Step(),
            pec_timer : new Timer( 0, 8, 0, "8 minut" )
        };

        this.postup.k = new Step( this.postup.k_mleko, this.postup.k_drozdi, this.postup.k_cukr, this.postup.k_timer );
        this.postup.t = new Step( this.postup.t_mouka, this.postup.t_cukr, this.postup.t_sul, this.postup.t_pp);
        this.postup.t2 = new Step( this.postup.t2_vejce, this.postup.t2_maslo, this.postup.t2_jogurt, this.postup.t2_kvasek);
        this.postup.kyn = new Step( this.postup.kyn_timer );


        this.noBubble = function(data, event) {
            event.stopPropagation();
        };

    };


})();

