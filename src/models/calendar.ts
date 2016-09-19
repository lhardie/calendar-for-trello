import * as _ from 'lodash';
import moment from 'moment';

export class CalDate {

    constructor(public year: number, public month: number) {

    }

    monthName() {
        return moment.months()[this.month];
    }
}