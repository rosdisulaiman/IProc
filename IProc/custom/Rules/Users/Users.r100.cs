using System;
using System.Data;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Web;
using System.Web.Security;
using IProc.Data;
using IProc.Models;
using System.Text;

namespace IProc.Rules
{
    public partial class UsersBusinessRules : IProc.Data.BusinessRules
    {

        /// <summary>This method will execute in the view with id matching "editForm1" for an action
        /// with a command name that matches "Select".
        /// </summary>
        [Rule("r100")]
        public void r100Implementation(
                    FieldValue userID,
                    string userName,
                    string password,
                    string email,
                    string comment,
                    string passwordQuestion,
                    string passwordAnswer,
                    bool? isApproved,
                    DateTime? lastActivityDate,
                    DateTime? lastLoginDate,
                    DateTime? lastPasswordChangedDate,
                    DateTime? creationDate,
                    bool? isLockedOut,
                    DateTime? lastLockedOutDate,
                    int? failedPasswordAttemptCount,
                    DateTime? failedPasswordAttemptWindowStart,
                    int? failedPasswordAnswerAttemptCount,
                    DateTime? failedPasswordAnswerAttemptWindowStart,
                    string confirmPassword,
                    string roles)
        {
            // concatenate user roles in comma-separated list
            StringBuilder sb = new StringBuilder();
            foreach (string role in System.Web.Security.Roles.GetRolesForUser(userName))
            {
                if (sb.Length > 0)
                    sb.Append(',');
                sb.Append(role);
            }
            // store the list of roles to the "Roles" field
            UpdateFieldValue("Roles", sb.ToString());
        }
    }
}
