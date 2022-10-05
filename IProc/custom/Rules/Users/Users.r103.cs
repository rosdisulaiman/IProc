using System;
using System.Data;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Web;
using System.Web.Security;
using IProc.Data;
using IProc.Models;

namespace IProc.Rules
{
    public partial class UsersBusinessRules : IProc.Data.BusinessRules
    {

        /// <summary>This method will execute in any view before an action
        /// with a command name that matches "Delete".
        /// </summary>
        [Rule("r103")]
        public void r103Implementation(
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
                    DateTime? failedPasswordAnswerAttemptWindowStart)
        {
            // prevent execution of CRUD operations by the application framework
            PreventDefault();
            // delete the user account
            MembershipUser user = Membership.GetUser(userName);
            Membership.DeleteUser(user.UserName);
            // instruct the client library to display the previous view
            Result.ShowLastView();
            // instruct the client library to show a confirmation message
            Result.ShowMessage(String.Format(Localize("UserHasBeenDeleted",
                "User \'{0}\' has been deleted."), user.UserName));
        }
    }
}
