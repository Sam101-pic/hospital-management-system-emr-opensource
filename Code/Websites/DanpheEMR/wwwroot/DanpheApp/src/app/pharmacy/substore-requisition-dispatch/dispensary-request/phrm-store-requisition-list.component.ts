import { Component, OnInit } from "@angular/core";
import { Router } from '@angular/router';

import GridColumnSettings from '../../../shared/danphe-grid/grid-column-settings.constant';
import { GridEmitModel } from "../../../shared/danphe-grid/grid-emit.model";

import * as moment from 'moment/moment';
import { CoreService } from "../../../core/shared/core.service";
import { DispensaryRequisitionService } from "../../../dispensary/dispensary-main/stock-main/requisition/dispensary-requisition.service";
import { DanpheHTTPResponse } from "../../../shared/common-models";
import { NepaliDateInGridColumnDetail, NepaliDateInGridParams } from "../../../shared/danphe-grid/NepaliColGridSettingsModel";
import { MessageboxService } from '../../../shared/messagebox/messagebox.service';
import { RouteFromService } from '../../../shared/routefrom.service';
import { ENUM_DanpheHTTPResponses } from "../../../shared/shared-enums";
import { PharmacyStoreStockDetail } from "../../shared/dtos/pharmacy-store-stock-detail";
import { PharmacyBLService } from "../../shared/pharmacy.bl.service";
import { PharmacyService } from '../../shared/pharmacy.service';
import { PHRMStoreDispatchItems } from "../../shared/phrm-store-dispatch-items.model";
import { PHRMStoreRequisitionItems } from "../../shared/phrm-store-requisition-items.model";
import { PHRMStoreRequisition } from "../../shared/phrm-store-requisition.model";
import { GeneralFieldLabels } from "../../../shared/DTOs/general-field-label.dto";

@Component({
      templateUrl: "./phrm-store-requisition-list.component.html",
      host: { '(window:keydown)': 'hotkeys($event)' }
})
export class PHRMStoreRequisitionListComponent implements OnInit {
      public requisitionList: Array<PHRMStoreRequisition> = null;
      public filterRequisitionList: PHRMStoreRequisition[] = [];
      public innerDispatchdetails: PHRMStoreDispatchItems = new PHRMStoreDispatchItems();
      public dispatchListbyId: Array<PHRMStoreDispatchItems> = new Array<PHRMStoreDispatchItems>();
      public requisitionItemsDetails: Array<PHRMStoreRequisitionItems> = new Array<PHRMStoreRequisitionItems>();
      public requisitionGridColumns: Array<any> = null;
      public dispatchList: Array<{ CreatedByName, CreatedOn, RequisitionId, DispatchId, ReceivedBy, DispatchedByName, DepartmentName, SourceStore, TargetStore, IssueNo }> = new Array<{ CreatedByName, CreatedOn, RequisitionId, DispatchId, ReceivedBy, DispatchedByName, DepartmentName, SourceStore, TargetStore, IssueNo }>();
      DispatchListGridColumns: Array<any> = null;
      //({ headerName: string; field: string; width: number; template?: undefined; } | { headerName: string; field: string; width: number; template: string; })[];
      public itemchecked: boolean = true;
      public showItemwise: boolean = false;
      public index: number = 0;
      public itemId: number = 0;
      public showDispatchList: boolean = false;
      public showDetailsbyDispatchId: boolean = false;
      public itemName: string = null;
      public requisitionId: number = 0;
      public requisitionDate: string = null;
      public ShowOutput: number = 0;
      public header: any = null;
      public createdby: string = "";
      public dispatchedby: string = "";
      public DispatchId: number = 0;
      public receivedby: string = "";
      departmentName: any;
      msgBoxServ: any;
      changeDetector: any;
      CoreService: any;
      Amount: any;
      DispatchedQuantity: any;
      StandardRate: any;
      TotalAmount: any;
      Sum: number = 0;
      public fromDate: string = null;
      public toDate: string = null;
      public dateRange: string = null;
      public NepaliDateInRequisitionGridSettings: NepaliDateInGridParams = new NepaliDateInGridParams();
      public NepaliDateInDispatchListGridSettings: NepaliDateInGridParams = new NepaliDateInGridParams();
      public showNepaliReceipt: boolean;
      currentDate: string = "";
      public stockList: PharmacyStoreStockDetail[] = [];
      IsStockLoaded: boolean = false;
      Status: string[] = [];


      public GeneralFieldLabel = new GeneralFieldLabels();
      constructor(public coreService: CoreService, public dispensaryRequisitionService: DispensaryRequisitionService,
            public PharmacyBLService: PharmacyBLService,
            public PharmacyService: PharmacyService,
            public router: Router,
            public routeFrom: RouteFromService,
            public messageBoxService: MessageboxService) {
             this.GeneralFieldLabel = coreService.GetFieldLabelParameter();      
            this.dateRange = 'last1Week';
            this.GetPharmacyBillingHeaderParameter()
            this.currentDate = moment().format('YYYY-MM-DD');
            this.NepaliDateInRequisitionGridSettings.NepaliDateColumnList.push(new NepaliDateInGridColumnDetail('RequisitionDate', false));
            this.requisitionGridColumns = GridColumnSettings.PHRMStoreRequisitionList;

            this.CheckReceiptSettings();
            if (this.PharmacyService.DispatchId > 0) {
                  this.ShowbyDispatchId(this.PharmacyService.DispatchId);
                  this.showDetailsbyDispatchId = true;
            }
            this.getGenericList();
            this.GetStockForItemDispatch();
      }
      ngOnInit() {
            this.DispatchListGridColumns = GridColumnSettings.PHRMDispatchList;
            this.NepaliDateInDispatchListGridSettings.NepaliDateColumnList.push(new NepaliDateInGridColumnDetail('CreatedOn', false));
      }
      ngOnDestroy() {
            this.PharmacyService.DispatchId = null;
      }
      onDateChange($event) {
            this.fromDate = $event.fromDate;
            this.toDate = $event.toDate;
            if (this.fromDate != null && this.toDate != null) {
                  if (moment(this.fromDate).isBefore(this.toDate) || moment(this.fromDate).isSame(this.toDate)) {
                        this.LoadRequisitionList();
                  } else {
                        this.messageBoxService.showMessage('failed', ['Please enter valid From date and To date']);
                  }
            }
      }

      LoadRequisitionList(): void {
            this.dispensaryRequisitionService.GetAllRequisitionList(this.fromDate, this.toDate)
                  .subscribe(res => {
                        if (res.Status == "OK") {
                              this.requisitionList = res.Results.requisitionList;
                              this.filterRequisitionList = res.Results.requisitionList;
                              if (this.Status.length) {
                                    this.filterRequisitionList = this.requisitionList.filter(a => this.Status.includes(a.RequisitionStatus));
                              }
                        }
                        else {
                              this.messageBoxService.showMessage("failed", ['failed to get Requisitions.....please check log for details.']);
                              ;
                              console.log(res.ErrorMessage);
                        }
                  });
      }
      FilterRequisitionList(status: string) {
            this.Status = [];
            if (status == "pending") {
                  this.Status = ["active", "partial"];
            }
            else if (status == "complete") {
                  this.Status = ["complete"];
            }
            else {
                  this.Status = ["active", "partial", "complete", "initiated", "cancelled"];
            }
            this.filterRequisitionList = this.requisitionList.filter(a => this.Status.includes(a.RequisitionStatus));
      }
      DeptGridAction($event: GridEmitModel) {
            switch ($event.Action) {
                  case "requisitionDispatch":
                        {
                              var data = $event.Data;
                              this.RouteToDispatch(data);
                              break;
                        }
                  case "view":
                        {
                              var data = $event.Data;
                              this.RouteToViewDetail(data);
                              break;
                        }
                  case "dispatchList":
                        {
                              var data = $event.Data;
                              this.requisitionId = data.RequisitionId;
                              this.departmentName = data.DepartmentName;
                              this.requisitionDate = data.RequisitionDate;
                              this.PharmacyBLService.GetDispatchDetails(this.requisitionId)
                                    .subscribe(res => this.ShoWDispatchbyRequisitionId(res));
                              this.showDispatchList = true;
                              break;;
                        }
                  case "approveTransfer":
                        {
                              var data = $event.Data;
                              this.requisitionId = data.RequisitionId;
                              this.dispensaryRequisitionService.ApproveRequisition(this.requisitionId)
                                    .subscribe(res => {
                                          if (res.Status == "OK") {
                                                this.messageBoxService.showMessage("Success", [`Requisition ${data.RequisitionNo} is approved successfully.`]);
                                                let selectedRequisition = this.filterRequisitionList.find(r => r.RequisitionId == this.requisitionId);
                                                selectedRequisition.RequisitionStatus = "complete";
                                                selectedRequisition.CanApproveTransfer = false;
                                                this.filterRequisitionList = this.filterRequisitionList.slice();
                                          }
                                          else {
                                                this.messageBoxService.showMessage("Failed", [`Requisition ${data.RequisitionNo} approval failed.`]);
                                          }
                                    },
                                          err => {
                                                this.messageBoxService.showMessage("Failed", [`Requisition ${data.RequisitionNo} approval failed.`]);
                                          });
                        }
                  default:
                        break;

            }
      }

      ShoWDispatchbyRequisitionId(res) {
            if (res.Status == "OK" && res.Results.length != 0) {
                  this.dispatchList = res.Results;
            }
            else {
                  this.showDispatchList = false;
                  this.messageBoxService.showMessage("notice-message", ["There is no Requisition details !"]);

            }

      }

      DispatchDetailsGridAction($event: GridEmitModel) {
            switch ($event.Action) {
                  case "view": {
                        if ($event.Data != null) {
                              var tempDispatchId = $event.Data.DispatchId;
                              this.innerDispatchdetails = $event.Data;
                              this.DispatchId = $event.Data.DispatchId;
                              this.CheckReceiptSettings()
                              this.PharmacyService.DispatchId = $event.Data.DispatchId
                              if (this.showNepaliReceipt == false) {
                                    this.ShowbyDispatchId(tempDispatchId);
                              }
                              this.showDispatchList = false;
                              this.showDetailsbyDispatchId = true;
                        }
                        break;
                  }
                  default:
                        break;
            }
      }
      ShowbyDispatchId(DispatchId) {
            this.PharmacyBLService.GetDispatchItemByDispatchId(DispatchId)
                  .subscribe(res => {
                        if (res.Status == "OK") {
                              this.dispatchListbyId = res.Results;
                              this.innerDispatchdetails.DispatchId = res.Results[0].DispatchId;
                              this.innerDispatchdetails.RequisitionNo = res.Results[0].RequistionNo;
                              this.innerDispatchdetails.ReceivedBy = res.Results[0].ReceivedBy;
                              this.requisitionDate = res.Results[0].RequisitionDate;
                              this.innerDispatchdetails.SourceStore = res.Results[0].SourceStore;
                              this.innerDispatchdetails.TargetStore = res.Results[0].TargetStore;
                              this.innerDispatchdetails.DispatchedDate = res.Results[0].DispatchedDate;
                              this.innerDispatchdetails.CreatedByName = res.Results[0].CreatedByName;
                              this.innerDispatchdetails.DispatchedByName = res.Results[0].DispatchedByName;
                              for (var i = 0; i < this.dispatchListbyId.length; i++) {
                                    this.Sum += (this.dispatchListbyId[i].StandardRate * this.dispatchListbyId[i].DispatchedQuantity);

                              }
                        }
                        else {
                              this.msgBoxServ.showMessage("failed", ['failed to get Dispatch List. ' + res.ErrorMessage]);
                        }
                  },
                        err => {
                              this.msgBoxServ.showMessage("error", ['failed to get Dispatch List. ' + err.ErrorMessage]);
                        }
                  );
      }

      RouteToDispatch(data) {
            //Pass the RequistionId and DepartmentName to Next page for getting DispatchItems using pharmacyService
            this.PharmacyService.Id = data.RequisitionId;
            this.PharmacyService.Name = data.DepartmentName;
            //this.router.navigate(['/Pharmacy/Store/StoreDispatch']);
            this.router.navigate(['/Pharmacy/SubstoreRequestAndDispatch/Dispatch']);
      }
      RouteToViewDetail(data) {
            //pass the Requisition Id to RequisitionView page for List of Details about requisition
            this.PharmacyService.Id = data.RequisitionId;
            this.PharmacyService.Name = data.DepartmentName;
            //this.router.navigate(['/Pharmacy/Store/StoreRequisitionDetails']);
            this.router.navigate(['/Pharmacy/SubstoreRequestAndDispatch/RequisitionDetails']);
      }
      gridExportOptions = {
            fileName: 'DispatchLists_' + moment().format('YYYY-MM-DD') + '.xls',
      };

      Close() {
            this.showDispatchList = false;
            this.showDetailsbyDispatchId = false;
            this.showNepaliReceipt = false;
            this.PharmacyService._Id = null
            this.Sum = 0;
            this.dispatchList.splice(0);
      }
      print() {
            let popupWinindow;
            var printContents = document.getElementById("printpage").innerHTML;
            popupWinindow = window.open('', '_blank', 'width=600,height=700,scrollbars=no,menubar=no,toolbar=no,location=no,status=no,titlebar=no');
            popupWinindow.document.open();
            popupWinindow.document.write('<html><head><style>.img-responsive{max-height: 70px; position: relative;left: -62px;top: 12px;} </style><link rel="stylesheet" type="text/css" href="../../themes/theme-default/ReceiptList.css" /><link rel="stylesheet" type="text/css" href="../../themes/theme-default/CommonPrintStyle.css" /></head><style>.printStyle {border: dotted 1px;margin: 10px 100px;}.print-border-top {border-top: dotted 1px;}.print-border-bottom {border-bottom: dotted 1px;}.print-border {border: dotted 1px;}.center-style {text-align: center;}.border-up-down {border-top: dotted 1px;border-bottom: dotted 1px;}</style><body onload="window.print()">' + printContents + '</html>');
            popupWinindow.document.close();
      }

      public headerDetail: { hospitalName, address, email, PANno, tel, DDA };

      //Get Pharmacy Billing Header Parameter from Core Service (Database) assign to local variable
      GetPharmacyBillingHeaderParameter() {
            var paramValue = this.coreService.Parameters.find(a => a.ParameterName == 'Pharmacy Receipt Header').ParameterValue;
            if (paramValue)
                  this.headerDetail = JSON.parse(paramValue);
            else
                  this.msgBoxServ.showMessage("error", ["Please enter parameter values for BillingHeader"]);
      }
      //route to create Requisition page
      DirectDispatch() {
            // this.router.navigate(['/Pharmacy/Store/DirectDispatch']);
            this.router.navigate(['/Pharmacy/SubstoreRequestAndDispatch/DirectDispatch']);
      }
      CheckReceiptSettings() {
            //check for english or nepali receipt style
            let receipt = this.coreService.Parameters.find(lang => lang.ParameterName == 'NepaliReceipt' && lang.ParameterGroupName == 'Common').ParameterValue;
            this.showNepaliReceipt = (receipt == "true");
      }
      public hotkeys(event) {
            //For ESC key => close the pop up
            if (event.keyCode == 27) {
                  this.Close();
            }
      }

      GetStockForItemDispatch() {
            this.PharmacyBLService.GetStoreStocksToDispatch()
                  .subscribe(res => {
                        if (res.Status == "OK") {
                              this.stockList = res.Results;
                              this.PharmacyService.setStockForItemDispatch(this.stockList);
                              this.IsStockLoaded = true;
                        }
                        else {
                              this.messageBoxService.showMessage("error", ["Failed to get Items. " + res.ErrorMessage]);
                        }
                  },
                        err => {
                              this.messageBoxService.showMessage("error", ["Failed to get Items. " + err.ErrorMessage]);
                        });
      }

      public getGenericList() {
            this.PharmacyBLService.GetGenericList()
                  .subscribe((res: DanpheHTTPResponse) => {
                        if (res.Status === ENUM_DanpheHTTPResponses.OK) {
                              this.PharmacyService.SetGenericList(res.Results)
                        }
                  });
      }

}
