import { Component } from "@angular/core";
import { Router } from "@angular/router";
import * as moment from "moment";
import { CoreService } from "../../../../core/shared/core.service";
import { PHRMStoreModel } from "../../../../pharmacy/shared/phrm-store.model";
import { SecurityService } from "../../../../security/shared/security.service";
import { GridEmitModel } from "../../../../shared/danphe-grid/grid-emit.model";
import { NepaliDateInGridColumnDetail, NepaliDateInGridParams } from "../../../../shared/danphe-grid/NepaliColGridSettingsModel";
import { MessageboxService } from "../../../../shared/messagebox/messagebox.service";
import WARDGridColumns from "../../../shared/ward-grid-cloumns";
import { WardSupplyAssetReturnModel } from "../../../shared/wardsupply-asset-return.model";
import { WardSupplyAssetReturnItemsModel } from "../../../shared/wardsupply-asset-returnItems.model";
import { WardSupplyBLService } from "../../../shared/wardsupply.bl.service";
import { wardsupplyService } from "../../../shared/wardsupply.service";
import { WardInventoryReturnModel } from "../ward-inventory-return.model";

@Component({

  templateUrl: "./inventory-return-list.html"

})
export class WardSupplyInventoryReturnList {

  public activeSubstoreId: number = 0;
  public returnId: number = null;
  public returnItemsDetails: Array<WardSupplyAssetReturnItemsModel> = new Array<WardSupplyAssetReturnItemsModel>();
  public ReturnGridData: Array<WardSupplyAssetReturnModel> = new Array<WardSupplyAssetReturnModel>();
  public ReturnGridDataFiltered: Array<WardSupplyAssetReturnModel> = new Array<WardSupplyAssetReturnModel>();
  public showItemwise: boolean = false;
  public fromDate: string = null;
  public toDate: string = null;
  public dateRange: string = null;
  public NepaliDateInGridSettings = new NepaliDateInGridParams();
  public inventoryList: Array<PHRMStoreModel> = new Array<PHRMStoreModel>();
  public selectedInventory: number = 0;
  public WardInventoryReturnGridColumns: Array<any> = [];
  public showReturnList = true;
  public showCreateReturn = false;
  public showReturnDetails = false;
  public returnDate: string = null;
  public createdByName: string = null;
  public mainRemarks: string = null;
  public RequisitionStatusFilter: string = "pending";
  returnDetail: WardInventoryReturnModel = new WardInventoryReturnModel();
  constructor(
    public router: Router,
    public wardsupplyService: wardsupplyService,
    public messageBoxService: MessageboxService,
    public coreService: CoreService,
    public wardsupplyBLService: WardSupplyBLService,
    public securityService: SecurityService,
  ) {
    this.activeSubstoreId = this.securityService.getActiveStore().StoreId;
    this.GetInventoryList()
  }
  GetInventoryList() {
    this.inventoryList = this.wardsupplyService.inventoryList.filter(inv => inv.IsActive);
    if (this.wardsupplyService.inventoryList.length > 0) {
      this.selectedInventory = this.inventoryList[0].StoreId;
      this.WardInventoryReturnGridColumns = WARDGridColumns.WardInventoryReturnList;
      this.dateRange = 'None';
      this.NepaliDateInGridSettings.NepaliDateColumnList.push(new NepaliDateInGridColumnDetail('ReturnDate', false));
    }
  }
  onDateChange($event) {
    this.fromDate = $event.fromDate;
    this.toDate = $event.toDate;
    if (this.fromDate != null && this.toDate != null) {
      if (moment(this.fromDate).isBefore(this.toDate) || moment(this.fromDate).isSame(this.toDate)) {
        this.LoadWardInventoryReturnListByDate();
      } else {
        this.messageBoxService.showMessage('failed', ['Please enter valid From date and To date']);
      }
    }
  }
  LoadWardInventoryReturnListByDate(): void {
    this.ReturnGridDataFiltered = new Array<WardSupplyAssetReturnModel>();
    this.wardsupplyBLService.GetWardInventoryReturnList(this.fromDate, this.toDate, this.activeSubstoreId)
      .subscribe(res => {
        if (res.Status == "OK") {
          this.ReturnGridData = res.Results;
          if (this.ReturnGridData.length == 0) {
            this.messageBoxService.showMessage("Notice", [
              "No Return Found. Please check the date."
            ]);
          }
          else {
            this.LoadReturnListByStatus();
          }
        }
        else {
          this.messageBoxService.showMessage("failed", ['failed to get return.....please check log for details.']);
          ;
          console.log(res.ErrorMessage);
        }
      });
  }
  OnInventoryChange() {
    this.LoadReturnListByStatus();
  }
  BackToGrid() {
    this.showItemwise = false;
    this.LoadWardInventoryReturnListByDate();
  }

  ReturnGridAction($event: GridEmitModel) {
    switch ($event.Action) {
      case "view": {
        var data = $event.Data;
        this.RouteToViewDetail(data);
        break;
      }

      default:
        break;
    }
  }

  RouteToViewDetail(data) {
    this.wardsupplyService.ReturnId = data.ReturnId;
    this.wardsupplyService.DepartmentName = data.DepartmentName;
    this.showCreateReturn = false;
    this.showReturnDetails = true;
    this.showReturnList = false
    this.LoadRereturnDetails(data.ReturnId)
  }

  CreateReturnObj() {
    this.showCreateReturn = true;
    this.showReturnDetails = false;
    this.showReturnList = false
  }
  CallBackNewReturn(event) {
    this.showCreateReturn = false;
    this.showReturnList = true;
  }
  CallBackDetails(event) {
    this.showReturnDetails = false;
    this.showReturnList = true;
  }
  LoadRereturnDetails(ReturnId: number) {
    if (ReturnId != null) {
      this.returnId = ReturnId;
      this.wardsupplyBLService.GetWardInventoryReturnItemsByReturnId(this.returnId)
        .subscribe(res => this.ShowRequisitionDetails(res));
    }
    else {
      this.messageBoxService.showMessage("notice-message", ['Please, Select Requisition for Details.']);
    }
  }
  ShowRequisitionDetails(res) {
    if (res.Status == "OK") {
      this.returnItemsDetails = res.Results.returnItemDetails;
      this.returnDetail = res.Results.returnDetail;
    }
    else {
      this.messageBoxService.showMessage("notice-message", ["There is no Requested details !"]);

    }
  }

  //this is used to print the receipt
  print() {
    let popupWinindow;
    var printContents = document.getElementById("printpage").innerHTML;
    popupWinindow = window.open('', '_blank', 'width=600,height=700,scrollbars=no,menubar=no,toolbar=no,location=no,status=no,titlebar=no');
    popupWinindow.document.open();
    popupWinindow.document.write(`
    <html>
      <head>
        <link rel="stylesheet" type="text/css" href="../../themes/theme-default/ReceiptList.css" />
      </head>
      <style>
        .printStyle {border: dotted 1px;margin: 10px 100px;}
        .print-border-top {border-top: dotted 1px;}
        .print-border-bottom {border-bottom: dotted 1px;}
        .print-border {border: dotted 1px;}
        .center-style {text-align: center;}
        .border-up-down {border-top: dotted 1px;border-bottom: dotted 1px;}
        .hidden-in-print { display:none !important}
      </style>
      <body onload="window.print()">`
      + printContents
      + "</html>");
    popupWinindow.document.close();
  }
  returnList() {
    this.showReturnDetails = false;
    this.showReturnList = true
  }
  LoadReturnListByStatus() {
    switch (this.RequisitionStatusFilter) {
      case "pending": {
        this.ReturnGridDataFiltered = this.ReturnGridData.filter(R => R.StoreId == this.selectedInventory);
        break;
      }
      case "complete": {
        this.ReturnGridDataFiltered = this.ReturnGridData.filter(R => R.StoreId == this.selectedInventory);
        break;
      }
      case "cancelled": {
        this.ReturnGridDataFiltered = this.ReturnGridData.filter(R => R.StoreId == this.selectedInventory);
        break;
      }
      case "withdrawn": {
        this.ReturnGridDataFiltered = this.ReturnGridData.filter(R => R.StoreId == this.selectedInventory);
        break;
      }
      default: {
        this.ReturnGridDataFiltered = this.ReturnGridData.filter(R => R.StoreId == this.selectedInventory);
      }
    }
  }

}