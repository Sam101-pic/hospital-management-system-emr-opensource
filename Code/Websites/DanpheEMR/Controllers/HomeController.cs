﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Threading;
using Microsoft.AspNetCore.Mvc;
using DanpheEMR.Security;
using DanpheEMR.Utilities;
using Microsoft.Extensions.Options;
using DanpheEMR.Core.Configuration;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net;
using System.IO;
using DanpheEMR.Core;
using Newtonsoft.Json;
using DanpheEMR.Core.Parameters;
namespace DanpheEMR.Controllers
{
    public class HomeController : Controller
    {

        private readonly string connString = null;
        public HomeController(IOptions<MyConfiguration> _config)
        {
            connString = _config.Value.Connectionstring;

        }

        public IActionResult Index()
        {
            try
            {
                //ViewData["token"] = TempData["token"]; // TempData is being set from AccountController Login Action
                CoreDbContext coreDbContext = new CoreDbContext(connString);
                ParameterModel whiteLabelParam = coreDbContext.Parameters
             .Where(p => p.ParameterGroupName == "WhiteLabel" && p.ParameterName == "WhiteLabel")
             .FirstOrDefault();

                string title = "Default Title"; // Default title 

                if (whiteLabelParam != null && !string.IsNullOrEmpty(whiteLabelParam.ParameterValue))
                {
                    var jsonValue = JsonConvert.DeserializeObject<Dictionary<string, string>>(whiteLabelParam.ParameterValue);
                    if (jsonValue.ContainsKey("DanpheHealth"))
                    {
                        title = jsonValue["DanpheHealth"];
                    }
                }

                // Set the custom title in ViewData 
                ViewData["CustomTitle"] = title;
                return View();
            }
            catch (Exception ex)
            {
                //Redirect to Login page If user is not login                           
                return RedirectToAction("Login", "Account");

            }
        }
        //move it out of patientcontroller to Maincontroller or something..
        public IActionResult AppMain()
        {
            try
            {
                RbacUser currentUser = HttpContext.Session.Get<RbacUser>("currentuser");
                ViewData["currentuser"] = currentUser;
                //getting only the root level routes for this view.//set getHierarchy = true for AppMain (special condition.)
                ViewData["validroutes"] = RBAC.GetRoutesForUser(currentUser.UserId, getHiearrchy: true);
                return View();
            }
            catch (Exception ex)
            {
                //throw ex;
                //Redirect to Login page If user is not login                           
                return RedirectToAction("Login", "Account");
            }
        }
        public IActionResult ChangePassword()
        {
            try
            {
                return View();
            }
            catch (Exception ex)
            {
                throw ex;
            }
        }


        public FileStreamResult GetUserManual()
        {
            FileStream usrManual = new FileStream("wwwroot\\fileuploads\\DanpheEMR_UserManual.pdf", FileMode.Open);
            return new FileStreamResult(usrManual,"application/pdf");
        }


    }
}