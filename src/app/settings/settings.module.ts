import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {SettingsComponent} from './settings.component';
import {EditBoardComponent} from "./edit-board/edit-board.component";
import {FormsModule} from "@angular/forms";
import {MdListModule, MdSelectModule, MdCardModule} from "@angular/material";
import {FlexLayoutModule} from "@angular/flex-layout";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    MdListModule,
    MdSelectModule,
    FlexLayoutModule,
    MdCardModule,
  ],
  declarations: [
    SettingsComponent,
    EditBoardComponent
  ]
})
export class SettingsModule {
}
