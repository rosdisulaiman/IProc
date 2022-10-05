using IProc.Data;
using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Web.Security;

namespace IProc.Services
{
    public partial class ApplicationServices
    {
        public override Image UserPictureImage(MembershipUser user)
        {
            using (SqlText sql = new SqlText("Select Picture from UserPictures where UserName = @UserName"))
            {
                sql.AssignParameter("@UserName", user.UserName);
                if (sql.Read())
                {
                    byte[] value = (byte[])sql["Picture"];
                    if (value != null)
                        return Image.FromStream(new MemoryStream(value));
                }
            }
            return base.UserPictureImage(user);
        }
    }
}
