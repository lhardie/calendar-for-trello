import * as _ from 'lodash';
import moment from 'moment'

import {appModule} from '../app';

export class CalDay {

    constructor(public date: Date, public dayOff: boolean, public cards: Array<any>, public isToday: boolean, public weekday: String) {

    }
}

export class CalBoard {
    // _lowername: card.boardName.toLowerCase(),
    constructor(public name: string, public id: string, public image: string, public email: string, public color: string) {

    }
}

class CalServiceConfig {
    public startOffset: number;
    public endOffSet: number;
}

class CalService {

    private boardsArray: Array<CalBoard>;
    private cards = [];
    private config: CalServiceConfig;

    constructor(private webStorage) {
        'ngInject';
        this.config = new CalServiceConfig();

    }

    public refresh() {
        this.cards = [];
        var card;
        if (this.webStorage.get('TrelloCalendarStorage').me.observer === true) {
            var all = (this.webStorage.get('TrelloCalendarStorage')).cards.all;
            for (card in all) {
                this.cards.push(all[card]);
            }

        }
        else {
            var my = (this.webStorage.get('TrelloCalendarStorage')).cards.my;
            for (card in my) {
                this.cards.push(my[card]);
            }

        }
    }

    private buildADay(date: Date, dayOff): CalDay {
        let momentDate: moment.Moment = moment(date);
        // var isToday = (date.setHours(0, 0, 0, 0) === new Date().setHours(0, 0, 0, 0));
        let isToday = momentDate.isSame(moment(), 'day');
        var day: CalDay =new CalDay(momentDate.toDate(),
            dayOff,
            [],
            isToday,
            momentDate.format('dddd')
        );

        let cardsOfToday = _.filter(this.cards, (card) => {
            let isSameDay = momentDate.isSame(moment(card.dueDay), 'day');
            return isSameDay;
        });

        _.forEach(cardsOfToday, function (card) {
            let board = new CalBoard(card.boardName,
                // _lowername: card.boardName.toLowerCase(),
                card.idBoard,
                '#',
                '#',
                card.color
            );

           this.boardsArray.push(board);
            day.cards.push(card);
        });

        return day;
    };


    private getDaysInMonth(year: number, month: number): Array<CalDay> {
        let days: Array<CalDay> = [];
        var date: Date = new Date(year, month, 1);
        /**
         * get start - offset
         */
        var runs = moment(date).isoWeekday();

        if (runs === 1) {
            // if week starts with monday, add 7 days
            runs = 8;
        }
        this.config.startOffset = runs - 1;
        var workDate: Date = new Date(date - 1);
        for (var d = 1; d < runs;) {
            days.push(this.buildADay(new Date(workDate.setHours(0, 0, 0, 0)), true));
            workDate.setDate(workDate.getDate() - 1);

            // if weekday is 1 push 7 days:
            d++;
        }
        days.reverse();
        /**
         * get days
         */

        while (date.getMonth() === month) {
            let newDay = this.buildADay(date, false);
            days.push(newDay);
            date.setDate(date.getDate() + 1);
        }

        /**
         * get end - offset
         */
        var a = days.length;
        if (a % 7 !== 0) {
            a = 7 - (a % 7);
        } else {
            a = 7;
        }
        this.config.endOffSet = a;
        for (var i = 0; i < a; i++) {
            days.push(this.buildADay(date, true));
            date.setDate(date.getDate() + 1);
        }

        return days;
    }

    public build(inDate) {
        this.boardsArray = [];

        let cards = _.groupBy(this.cards, 'dueDay');

        delete cards.undefined;

        let days = this.getDaysInMonth(inDate.year, inDate.month);

        return {
            config: this.config,
            days: days,
            boards: this.boardsArray
        };
    }

    boards() {
        return _.uniqBy(this.boardsArray, function (item) {
            return 'id:' + item.id + 'name:' + item.name;
        });


    }

}

appModule.service('CalService', CalService);