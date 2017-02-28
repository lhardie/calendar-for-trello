import {Injectable} from '@angular/core';
import {NgRedux} from 'ng2-redux';
import {RootState} from '../store';
import {List} from "../../models/list";
import {Board} from "../../models/board";

@Injectable()
export class ListActions {
  constructor(private ngRedux: NgRedux<RootState>) {
  }

  static SET_LIST: string = 'SET_LIST';
  static RESET_LIST_STORE: string = 'RESET_LIST_STORE';
  static UPDATE_PULLED_AT: string = 'UPDATE_PULLED_AT';


  public resetStore() {
    this.ngRedux.dispatch({type: ListActions.RESET_LIST_STORE})
  }


  public rebuildStorePartially(lists: List[], board: Board, time: Date) {
    lists.map(
      list => this.ngRedux.dispatch({type: ListActions.SET_LIST, payload: list})
    );
  }
}
