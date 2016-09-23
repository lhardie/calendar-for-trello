import * as _ from 'lodash';
import moment from 'moment';

import {appModule} from '../app';
import {Dictionary} from 'lodash';
import {WebStorageAdapter} from './WebStorageAdapter';

export class CalDay {

    constructor(public date: Date, public dayOff: boolean, public cards: Array<any>, public isToday: boolean, public weekday: String) {

    }
}

export class CalBoard {
    constructor(public name: string, public id: string, public image: string, public email: string, public color: string) {

    }
}

class CalServiceConfig {
    public startOffset: number;
    public endOffSet: number;
}

export class CalendarService {

    private boardsArray: Array<CalBoard>;
    private config: CalServiceConfig;

    constructor(private WebStorageAdapter: WebStorageAdapter) {
        'ngInject';
        this.config = new CalServiceConfig();

    }

    private loadCardsFromWebStorage() {
        let cards = [];
        if (this.WebStorageAdapter.getStorage().me.observer === true) {
            var all = this.WebStorageAdapter.getStorage().cards.all;
            for (let card in all) {
                if (all.hasOwnProperty(card)) {
                    cards.push(all[card]);
                }
            }

        } else {
            var my = this.WebStorageAdapter.getStorage().cards.my;
            for (let card in my) {
                if (my.hasOwnProperty(card)) {
                    cards.push(my[card]);
                }
            }
        }

        return cards;
    }


    public days(inDate) {
        let cards = this.loadCardsFromWebStorage();
        this.boardsArray = [];

        let withDueDate = _.filter(cards, (card) => false === _.isUndefined(card.dueDay));
        let cardsGrouped = _.groupBy(withDueDate, (card) => moment(card.dueDay).startOf('day').unix());
        let days = this.getDaysInMonth(inDate.year, inDate.month, cardsGrouped);

        return days;
    }


    //TODO jblankenhorn 22.09.16 Refactor: This method is using a lot of sideeffects from buildADay
    public boards() {
        return _.uniqBy(this.boardsArray, function (item) {
            return 'id:' + item.id + 'name:' + item.name;
        });
    }

    private buildADay(date: Date, dayOff, cards: Dictionary<Array<any>>): CalDay {
        let momentDate: moment.Moment = moment(date);
        // var isToday = (date.setHours(0, 0, 0, 0) === new Date().setHours(0, 0, 0, 0));
        let isToday = momentDate.isSame(moment(), 'day');
        var day: CalDay = new CalDay(momentDate.toDate(),
            dayOff,
            [],
            isToday,
            momentDate.format('dddd')
        );

        let cardsOfToday = cards[momentDate.startOf('day').unix()];

        _.forEach(cardsOfToday, (card) => {
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

   private getDaysInMonth(year: number, month: number, cards: Dictionary<Array<any>>): Array<CalDay> {


        let days: Array<CalDay> = [];
        var firstDayInMonth: Date = new Date(year, month, 1);
        /**
         * get start - offset
         */
        var runs = moment(firstDayInMonth).isoWeekday();

        if (runs === 1) {
            // if week starts with monday, add 7 days
            runs = 8;
        }
        this.config.startOffset = runs - 1;
        var workDate: Date = moment(firstDayInMonth).add(-1, 'day').toDate();
        for (var d = 1; d < runs; ) {
            days.push(this.buildADay(new Date(workDate.setHours(0, 0, 0, 0)), true, cards));
            workDate.setDate(workDate.getDate() - 1);

            // if weekday is 1 push 7 days:
            d++;
        }
        days.reverse();
        /**
         * get days
         */

        while (firstDayInMonth.getMonth() === month) {
            let newDay = this.buildADay(firstDayInMonth, false, cards);
            days.push(newDay);
            firstDayInMonth.setDate(firstDayInMonth.getDate() + 1);
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
            days.push(this.buildADay(firstDayInMonth, true, cards));
            firstDayInMonth.setDate(firstDayInMonth.getDate() + 1);
        }

        return days;
    }
}

appModule.service('CalendarService', CalendarService);