﻿using DanpheEMR.Core.Configuration;
using DanpheEMR.DalLayer;
using DanpheEMR.Enums;
using DanpheEMR.ServerModel;
using DanpheEMR.Services.LIS.DTOs;
using DanpheEMR.Utilities;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Data;
using System.Data.Entity;
using System.Data.SqlClient;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Transactions;
using System.Web.ModelBinding;

namespace DanpheEMR.Services.LIS
{
    public class LISService : ILISService
    {
        public LISDbContext lisDbContext;
        public string connStr;
        public string LISComputerServerURL;

        public LISService(IOptions<MyConfiguration> _config)
        {
            this.connStr = _config.Value.Connectionstring;
            lisDbContext = new LISDbContext(connStr);

            this.LISComputerServerURL = _config.Value.LISDataBaseUrl + "api/MachineData/";
        }

        public async Task<LISMasterData> GetAllMasterDataAsync()
        {
            LISMasterData data = new LISMasterData();

            //call the api to get the data
            data.LISComponentList = await GetAllLisMasterComponentAsync();
            data.LISMachineMasterList = (from d in data.LISComponentList
                                         group d by d.MachineId into grp
                                         let machine = grp.Where(a => a.MachineId == grp.Key).Select(s => s).FirstOrDefault()
                                         select new LISMachineMaster
                                         {
                                             MachineId = grp.Key,
                                             MachineName = machine.MachineName,
                                             MachineCode = machine.MachineCode,
                                             ModelName = machine.ModelName,
                                             IsMachineOrderRequired = machine.IsMachineOrderRequired,
                                         }).ToList();
            return data;
        }

        public async Task<List<LISComponentMasterVM>> GetAllLisMasterComponentAsync()
        {

            // Start: Getting LIS Lab machine and its components from LIS WebApi Application 
            List<LISComponentMasterVM> data = new List<LISComponentMasterVM>();
            using (var client = new HttpClient())
            {
                client.BaseAddress = new Uri(LISComputerServerURL);
                //HTTP GET
                var responseTask = client.GetAsync("GetAllMasterData");
                responseTask.Wait();

                var result = responseTask.Result;
                if (result.IsSuccessStatusCode)
                {
                    string labData = await result.Content.ReadAsStringAsync();
                    data = DanpheJSONConvert.DeserializeObject<List<LISComponentMasterVM>>(labData);
                }
            }
            // End : Getting LIS Lab machine and its components from LIS WebApi Application 


            return data;
        }

        public async Task<List<LISComponentMapModel>> GetAllMappedData()
        {
            var allLISMasterData = await GetAllLisMasterComponentAsync();
            var allMappings = lisDbContext.LISComponentMap.AsNoTracking().ToList();
            var allComponents = lisDbContext.LabTestComponents.AsNoTracking().ToList();

            var retData = (from map in allMappings
                           join lisMaster in allLISMasterData on map.LISComponentId equals lisMaster.LISComponentMasterId
                           join comp in allComponents on map.ComponentId equals comp.ComponentId
                           select new LISComponentMapModel
                           {
                               MachineName = lisMaster.MachineName,
                               ComponentName = comp.ComponentName,
                               LISComponentName = lisMaster.ComponentName,
                               ComponentId = map.ComponentId,
                               LISComponentId = map.LISComponentId,
                               LISComponentMapId = map.LISComponentMapId,
                               MachineId = map.MachineId,
                               IsActive = map.IsActive,
                               ConversionFactor = map.ConversionFactor
                           }).ToList();
            return retData;
        }

        public IEnumerable<ComponentMasterToMap> GetAllNotMappedDataByMachineId(int id, int? slectedMapId)
        {
            //int selMapId = slectedMapId.HasValue ? slectedMapId.Value : 0;
            //var compList = lisDbContext.LabTestComponents.AsNoTracking().AsEnumerable(); // components master table
            //var mappedCompList = lisDbContext.LISComponentMap.AsNoTracking().AsEnumerable();
            //var dataTemp = (from comp in compList
            //                join mappedComp in mappedCompList on comp.ComponentId equals mappedComp.ComponentId
            //                where mappedComp.IsActive && (mappedComp.MachineId == id) && ((mappedComp.LISComponentMapId != selMapId))
            //                select comp.ComponentId).ToList();
            var dataToReturn = lisDbContext.LabTestComponents.AsNoTracking().Select(comp => 
                                new ComponentMasterToMap
                                {
                                    ComponentId = comp.ComponentId,
                                    ComponentName = comp.ComponentName,
                                    DisplayName = comp.DisplayName
                                }).ToList();
            return dataToReturn;
        }

        public LISComponentMapModel GetSelectedMappedDataById(int id)
        {
            return lisDbContext.LISComponentMap.AsNoTracking().Where(d => d.LISComponentMapId == id).FirstOrDefault();
        }

        public void AddUpdateMapping(List<LISComponentMapModel> mapping)
        {
            int LISCompMapIdOfFirstElem = mapping[0].LISComponentMapId;
            if (LISCompMapIdOfFirstElem > 0)
            {
                var data = lisDbContext.LISComponentMap.Where(d => d.LISComponentMapId == LISCompMapIdOfFirstElem).FirstOrDefault();
                data.LISComponentId = mapping[0].LISComponentId;
                data.ComponentId = mapping[0].ComponentId;
                data.ConversionFactor = mapping[0].ConversionFactor;
                data.ModifiedBy = mapping[0].ModifiedBy;
                data.ModifiedOn = mapping[0].ModifiedOn;
                lisDbContext.SaveChanges();
            }
            else
            {
                lisDbContext.LISComponentMap.AddRange(mapping);
                lisDbContext.SaveChanges();
            }
        }

        public void DeleteMapping(int id, int userId)
        {
            var data = lisDbContext.LISComponentMap.Where(d => d.LISComponentMapId == id).FirstOrDefault();
            if (data != null)
            {
                data.IsActive = false;
                data.ModifiedBy = userId;
                data.ModifiedOn = System.DateTime.Now;
                lisDbContext.SaveChanges();
            }
        }

        public void ActivateMapping(int id, int userId)
        {
            var data = lisDbContext.LISComponentMap.Where(d => d.LISComponentMapId == id).FirstOrDefault();
            if (data != null)
            {
                data.IsActive = true;
                data.ModifiedBy = userId;
                data.ModifiedOn = System.DateTime.Now;
                lisDbContext.SaveChanges();
            }
        }

        public async Task<List<MachineResultsFormatted>> GetMachineResults(int machineId, DateTime fromDate, DateTime toDate)
        {
            var machineList = GetAllMasterDataAsync().GetAwaiter().GetResult().LISMachineMasterList;


            // Start: Getting LIS Lab Results from LIS WebApi Application 
            List<MachineResults> lisResultData = new List<MachineResults>();
            using (var client = new HttpClient())
            {
                client.BaseAddress = new Uri(LISComputerServerURL);
                //HTTP GET
                var responseTask = client.GetAsync("GetMachineResultsByMachineId?machineId=" + machineId +"&fromDate="+ fromDate +"&toDate=" + toDate);
                responseTask.Wait();

                var result = responseTask.Result;
                if (result.IsSuccessStatusCode)
                {
                    string labData = await result.Content.ReadAsStringAsync();
                    lisResultData = DanpheJSONConvert.DeserializeObject<List<MachineResults>>(labData);
                }

            }
            // End: Getting LIS Lab Results from LIS WebApi Application 


            var distinctBarcodesFromResult = lisResultData.Select(d => d.BarcodeNumber.ToString()).Distinct().ToList();
            var distinctLISComponentsFromResult = lisResultData.Select(d => d.LISComponentId).Distinct().ToList();

            var allReqByBarcodeNumber = (from req in lisDbContext.Requisitions
                                         join test in lisDbContext.LabTests on req.LabTestId equals test.LabTestId
                                         join pat in lisDbContext.Patients on req.PatientId equals pat.PatientId
                                         join map in lisDbContext.LabTestComponentMap on req.LabTestId equals map.LabTestId
                                         join comp in lisDbContext.LabTestComponents on map.ComponentId equals comp.ComponentId
                                         join lisCompMap in lisDbContext.LISComponentMap on comp.ComponentId equals lisCompMap.ComponentId
                                         where (map.IsActive == true) && lisCompMap.IsActive && (lisCompMap.MachineId == machineId)
                                         && (distinctBarcodesFromResult.Contains(req.BarCodeNumber.ToString())) && distinctLISComponentsFromResult.Contains(lisCompMap.LISComponentId)
                                         && ((req.OrderStatus == ENUM_LabOrderStatus.Active) || (req.OrderStatus == ENUM_LabOrderStatus.Pending))
                                         && (comp.ControlType.ToLower() != "label")
                                         select new
                                         {
                                             BarcodeNumber = req.BarCodeNumber.Value,
                                             LISComponentId = lisCompMap.LISComponentId,
                                             ConversionFactor = lisCompMap.ConversionFactor,
                                             Patient = pat,
                                             Test = test,
                                             Requisition = req,
                                             Component = comp,
                                             DisplaySequence = map.DisplaySequence,
                                             GroupName = map.GroupName,
                                         }).ToList();

            var dataToReturn = (from req in allReqByBarcodeNumber
                                join lisRes in lisResultData on new { req.LISComponentId, req.BarcodeNumber } equals new { lisRes.LISComponentId, lisRes.BarcodeNumber }
                                select new MachineResultsVM
                                {
                                    HospitalNumber = req.Patient.PatientCode,
                                    BarCodeNumber = req.BarcodeNumber,
                                    LISComponentId = req.LISComponentId,
                                    RunNumber = req.Requisition.SampleCodeFormatted,
                                    RequisitionId = req.Requisition.RequisitionId,
                                    LabTestName = req.Test.LabTestName,
                                    LISComponentName = lisRes.LISComponentName,
                                    LabTestId = req.Requisition.LabTestId,
                                    VisitType = req.Requisition.VisitType,
                                    PatientName = req.Patient.ShortName,
                                    Gender = req.Patient.Gender,
                                    PatientId = req.Patient.PatientId,
                                    Age = req.Patient.Age,
                                    PatientVisitId = req.Requisition.PatientVisitId,
                                    TemplateId = req.Test.ReportTemplateId,
                                    Component = req.Component,
                                    MachineUnit = lisRes.Unit,
                                    Value = lisRes.Value,
                                    ConversionFactor = req.ConversionFactor,
                                    LISComponentResultId = lisRes.LISComponentResultId,
                                    IsSelected = false,
                                    IsValueValid = true,
                                    DateOfBirth = req.Patient.DateOfBirth,
                                    DisplaySequence = req.DisplaySequence,
                                    GroupName  = req.GroupName,
                                    IsGroupValid = true,
                                    ErrorMessage = "",
                                }).OrderBy(a => a.DisplaySequence).ToList();

            var groupedData = (from d in dataToReturn
                               group d by new { d.BarCodeNumber, d.HospitalNumber, d.RunNumber, d.LabTestName, d.PatientName, d.PatientId, d.LabTestId } into grp
                               select new MachineResultsFormatted
                               {
                                   BarCodeNumber = grp.Key.BarCodeNumber,
                                   HospitalNumber = grp.Key.HospitalNumber,
                                   LabTestName = grp.Key.LabTestName,
                                   PatientName = grp.Key.PatientName,
                                   RunNumber = grp.Key.RunNumber,
                                   PatientId = grp.Key.PatientId,
                                   LabTestId = grp.Key.LabTestId,
                                   Data = grp.Where(s => (s.BarCodeNumber == grp.Key.BarCodeNumber) && (s.PatientId == grp.Key.PatientId) && (s.LabTestId == grp.Key.LabTestId) && (s.HospitalNumber == grp.Key.HospitalNumber)).ToList()
                               }).ToList();

            return groupedData;
        }

        public async Task<object> GetMachineResultByBarcodeNumber(Int64 BarcodeNumber)
        {
            List<MachineResults> lisResultData = new List<MachineResults>();
            using (var client = new HttpClient())
            {
                client.BaseAddress = new Uri(LISComputerServerURL);
                var responseTask = client.GetAsync("GetMachineResultsByBarcodeNumber?BarcodeNumber=" + BarcodeNumber.ToString());
                responseTask.Wait();

                var result = responseTask.Result;
                if (result.IsSuccessStatusCode)
                {
                    string labData = await result.Content.ReadAsStringAsync();
                    lisResultData = DanpheJSONConvert.DeserializeObject<List<MachineResults>>(labData);
                }

            }
            var finalResult = (from lisCompMap in lisDbContext.LISComponentMap.AsEnumerable()
                               join lisResult in lisResultData on new { lisCompMap.MachineId, lisCompMap.LISComponentId } equals new { lisResult.MachineId, lisResult.LISComponentId }
                               where (lisCompMap.IsActive == true)
                               select new
                               {
                                   LisResultId = lisResult.LISComponentResultId,
                                   ComponentId = lisCompMap.ComponentId,
                                   ConversionFactor = lisCompMap.ConversionFactor,
                                   Value = lisResult.Value,
                               }).ToList();

            return finalResult;
        }

        public IEnumerable<LISMachineMaster> GetAllMachines()
        {
            var machineList = GetAllMasterDataAsync().GetAwaiter().GetResult().LISMachineMasterList;
            return machineList;
        }

        public async Task<bool> AddLISDataToDanphe(List<MachineResultsVM> machineData)
        {
            if (IsValidForAddResult(machineData, lisDbContext))
            {
                var distinctReqId = machineData.Select(s => s.RequisitionId).Distinct();
                string allReqIdListStr = "";
                allReqIdListStr = string.Join(",", distinctReqId);
                var reqIdList = distinctReqId.ToList();
                foreach (var reqId in reqIdList)
                {
                    var complist = (from req in lisDbContext.Requisitions.Where(a => a.RequisitionId == reqId)
                                    join labtest in lisDbContext.LabTests on req.LabTestId equals labtest.LabTestId
                                    join componentMap in lisDbContext.LabTestComponentMap on labtest.LabTestId equals componentMap.LabTestId
                                    join component in lisDbContext.LabTestComponents on componentMap.ComponentId equals component.ComponentId
                                    where componentMap.IsActive == true
                                    select new
                                    {
                                        RequisitionId = req.RequisitionId,
                                        LabTestId = labtest.LabTestId,
                                        Value = "",
                                        Unit = "",
                                        Component = component,
                                        IsAbnormal = false,
                                        TemplateId = 1,
                                        CreatedBy = 1,
                                        CreatedOn = DateTime.Now,
                                        IsActive = true,
                                        ResultGroup = 1,
                                        ComponentId = component.ComponentId

                                    }).Distinct().ToList();
                    var nolist = machineData.Where(a => a.RequisitionId == reqId).Select(a => a.Component.ComponentId).Distinct().ToList();
                    var missinglist = complist.Select(a => a.ComponentId).Except(nolist).ToList();
                    foreach (var id in missinglist)
                    {
                        var value = new MachineResultsVM();
                        var temp = complist.Where(a => a.ComponentId == id).ToList();
                        value.LabTestId = temp.Select(a => a.LabTestId).FirstOrDefault();
                        value.LISComponentId = temp.Select(a => a.ComponentId).FirstOrDefault();
                        value.Component = temp.Select(a => a.Component).FirstOrDefault();
                        value.LISComponentName = temp.Select(a => a.Component.ComponentName).FirstOrDefault();
                        value.Value = temp.Select(a => a.Value).FirstOrDefault();
                        value.IsAbnormal = temp.Select(a => a.IsAbnormal).FirstOrDefault();
                        value.TemplateId = temp.Select(a => a.TemplateId).FirstOrDefault();
                        value.CreatedBy = temp.Select(a => a.CreatedBy).FirstOrDefault();
                        value.CreatedOn = temp.Select(a => a.CreatedOn).FirstOrDefault();
                        value.LISComponentId = temp.Select(a => a.ComponentId).FirstOrDefault();
                        value.RequisitionId = temp.Select(a => a.RequisitionId).FirstOrDefault();
                        machineData.Add(value);
                    }
                }
                var mappedDataToInsert = CommonFunctions.MapMachineResultsToComponentResults(machineData);
                var distinctLISComponentResultId = machineData.Select(s => s.LISComponentResultId).ToList();
                var currentDateTime = System.DateTime.Now;
                var payload = DanpheJSONConvert.SerializeObject(distinctLISComponentResultId);

                List<LISSyncedComponentDetail> syncedCompDetail = new List<LISSyncedComponentDetail>();
                foreach (var item in distinctLISComponentResultId)
                {
                    var syncedComp = new LISSyncedComponentDetail();
                    syncedComp.LISComponentResultId = item;
                    syncedComp.SyncStatus = true;
                    syncedComp.CreatedOn = currentDateTime;
                    syncedComp.SyncStatus = true;
                    syncedCompDetail.Add(syncedComp);
                }



                using (TransactionScope trans = new TransactionScope(TransactionScopeAsyncFlowOption.Enabled))
                {
                    try
                    {
                        lisDbContext.LabTestComponentResults.AddRange(mappedDataToInsert);
                        lisDbContext.SaveChanges();


                        var allLabRequisitions = lisDbContext.Requisitions.Where(r => distinctReqId.Contains(r.RequisitionId));
                        DataTable storedProcdureParam = new DataTable();
                        storedProcdureParam.Columns.Add("RequisitionId", typeof(long));
                        storedProcdureParam.Columns.Add("OrderStatus", typeof(string));

                        foreach (var item in allLabRequisitions)
                        {
                            item.ResultAddedBy = mappedDataToInsert[0].CreatedBy;
                            item.ResultAddedOn = currentDateTime;
                            item.OrderStatus = ENUM_LabOrderStatus.ResultAdded;   // "result-added";
                            lisDbContext.Entry(item).Property(a => a.OrderStatus).IsModified = true;
                            lisDbContext.Entry(item).Property(a => a.ResultAddedBy).IsModified = true;
                            lisDbContext.Entry(item).Property(a => a.ResultAddedOn).IsModified = true;
                            storedProcdureParam.Rows.Add(item.RequisitionId, ENUM_BillingOrderStatus.Final);
                        }
                        lisDbContext.SaveChanges();


                        allReqIdListStr = allReqIdListStr.Substring(0, (allReqIdListStr.Length - 1));
                        List<SqlParameter> paramList = new List<SqlParameter>(){
                                                    new SqlParameter("@RequisitionId_OrderStatus", storedProcdureParam)
                                                };
                        DataTable statusUpdated = DALFunctions.GetDataTableFromStoredProc("SP_Bill_OrderStatusUpdate", paramList, lisDbContext);

                        //send data to the API of LIS to Update Sync Status for distinctLISComponentResultId list
                        //save the Synced data to new db
                        //update the sync status first
                        //if success then OK
                        //else send data again to update sync status back to false

                        lisDbContext.LISSyncedComponentDetails.AddRange(syncedCompDetail);


                        try
                        {
                            //Update the sync status of List of ResultsId  with true
                            using (var client = new HttpClient())
                            {
                                var uri = LISComputerServerURL + "SetResultSyncStatus";
                                HttpContent c = new StringContent(payload, Encoding.UTF8, "application/json");
                                HttpResponseMessage result = await client.PostAsync(uri, c);
                                if (!result.IsSuccessStatusCode)
                                {
                                    throw new Exception("Server Error Cannot save data");
                                }
                            }
                        }
                        catch (Exception ex)
                        {
                            throw;
                        }

                        trans.Complete();
                        return true;
                    }
                    catch (Exception ex)
                    {
                        try
                        {
                            foreach (var item in syncedCompDetail)
                            {
                                item.SyncStatus = false;
                            }
                            lisDbContext.LISSyncedComponentDetails.AddRange(syncedCompDetail);

                            //Update the sync status of List of ResultsId with false
                            using (var client = new HttpClient())
                            {
                                var uri = LISComputerServerURL + "ResetResultSyncStatus";
                                HttpContent c = new StringContent(payload, Encoding.UTF8, "application/json");
                                HttpResponseMessage result = await client.PostAsync(uri, c);
                                if (!result.IsSuccessStatusCode)
                                {
                                    throw new Exception("Server Error Cannot save data");
                                }
                            }
                            return false;
                        }
                        catch (Exception ex1)
                        {
                            throw;
                        }
                        throw ex;
                    }
                }
            }
            else
            {
                return false;
            }

        }

        public async Task<bool> AddMachineOrder(List<Int64> reqIds)
        {
            // Fetch allLISMasterData asynchronously
            var allLISMasterDataTask = GetAllLisMasterComponentAsync();

            // Perform other database-related queries asynchronously
            var orderToInsertTask = (from requisition in lisDbContext.Requisitions
                                     join reqId in reqIds on requisition.RequisitionId equals reqId
                                     join patient in lisDbContext.Patients on requisition.PatientId equals patient.PatientId
                                     join componentMap in lisDbContext.LabTestComponentMap on requisition.LabTestId equals componentMap.LabTestId
                                     join lisComponentMap in lisDbContext.LISComponentMap on componentMap.ComponentId equals lisComponentMap.ComponentId
                                     where componentMap.IsActive == true && lisComponentMap.IsActive == true
                                     select new
                                     {
                                         requisition,
                                         patient,
                                         lisComponentMap
                                     }).ToListAsync();

            // Wait for both tasks to complete
            await Task.WhenAll(allLISMasterDataTask, orderToInsertTask);

            var allLISMasterData = await allLISMasterDataTask;
            var orderToInsertData = await orderToInsertTask;
            allLISMasterData = allLISMasterData.Where(a => a.IsMachineOrderRequired == true).ToList();

            // Join allLISMasterData with the other data
            var orderToInsert = (from data in orderToInsertData
                                 join lisMaster in allLISMasterData on data.lisComponentMap.LISComponentId equals lisMaster.LISComponentMasterId
                                 select new LIS_Machine_Order_DTO
                                 {
                                     BarCodeNumber = data.requisition.BarCodeNumber.ToString(),
                                     MachineComponentName = lisMaster.ComponentDisplayName,
                                     PatientCode = data.patient.PatientCode,
                                     PatientName = data.patient.ShortName,
                                     Gender = data.patient.Gender,
                                     SpecimenType = data.requisition.LabTestSpecimen,
                                     MachineId = lisMaster.MachineId,
                                     MachineName = lisMaster.MachineName,
                                     CreatedOn = DateTime.Now
                                 }).ToList();
            if (orderToInsert.Count > 0)
            {
                var groupedMachineOrder = orderToInsert.GroupBy(a => new { a.BarCodeNumber, a.MachineId }).Select(b => new LIS_Machine_Order_DTO
                {
                    BarCodeNumber = b.Key.BarCodeNumber.ToString(),
                    MachineComponentName = String.Join(",", b.Select(a => a.MachineComponentName)),
                    PatientCode = b.First().PatientCode,
                    PatientName = b.First().PatientName,
                    Gender = b.First().Gender,
                    SpecimenType = b.First().SpecimenType,
                    MachineId = b.First().MachineId,
                    MachineName = b.First().MachineName,
                    CreatedOn = DateTime.Now
                }).ToList();

                var payload = DanpheJSONConvert.SerializeObject(groupedMachineOrder);

                using (var client = new HttpClient())
                {
                    var uri = LISComputerServerURL + "MachineOrder";
                    HttpContent c = new StringContent(payload, Encoding.UTF8, "application/json");
                    HttpResponseMessage result = await client.PostAsync(uri, c);
                    if (!result.IsSuccessStatusCode)
                    {
                        throw new Exception("Server Error Cannot save data");
                    }
                }
            }
            return true;
        }

        public async Task<bool> UpdateMachineResultSyncStatus(List<int> resultIds)
        {
            try
            {
                using (var client = new HttpClient())
                {
                    var payload = DanpheJSONConvert.SerializeObject(resultIds);
                    var uri = LISComputerServerURL + "SetResultSyncStatus";
                    HttpContent c = new StringContent(payload, Encoding.UTF8, "application/json");
                    HttpResponseMessage result = await client.PostAsync(uri, c);
                    if (!result.IsSuccessStatusCode)
                    {
                        throw new Exception("Server Error Cannot save data");
                    }
                }
                return false;
            }
            catch (Exception ex)
            {
                throw ex;
            }
        }

        private Boolean IsValidForAddResult(List<MachineResultsVM> labComponentFromClient, LISDbContext labDbContext)
        {
            var isValid = false;
            List<Int64> distinctRequisitions = labComponentFromClient.Select(a => a.RequisitionId).Distinct().ToList();
            var ReqList = labDbContext.Requisitions.Where(a => distinctRequisitions.Contains(a.RequisitionId)).ToList();
            isValid = ReqList.All(a => a.OrderStatus == ENUM_LabOrderStatus.Pending);
            return isValid;
        }

    }
}