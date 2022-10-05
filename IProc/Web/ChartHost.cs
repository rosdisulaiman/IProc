using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Web;
using System.Web.Security;
using System.Web.UI;
using System.Web.UI.HtmlControls;
using System.Web.UI.DataVisualization.Charting;
using System.Web.UI.WebControls;

namespace IProc.Web
{
    public class ChartHost : System.Web.UI.Page
    {

        protected override void OnInit(EventArgs e)
        {
            Controls.Add(new LiteralControl("\n<!DOCTYPE html PUBLIC \"-//W3C//DTD XHTML 1.0 Transitional//EN\" \"http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd\">\n<html xmlns=\"http://www.w3.org/1999/xhtml\" style=\"overflow: hidden\">\n"));
            var head = new HtmlHead();
            Controls.Add(head);
            Controls.Add(new LiteralControl("\n<body>\n    "));
            var form = new HtmlForm();
            Controls.Add(form);
            Controls.Add(new LiteralControl("\n</body>\n</html>\n"));
            var controlName = Request.Params["c"];
            if (!string.IsNullOrEmpty(controlName))
            {
                var c = LoadControl(string.Format("~/Controls/Chart_{0}.ascx", controlName));
                form.Controls.Add(c);
            }
            base.OnInit(e);
            EnableViewState = false;
        }

        private Chart FindChart(ControlCollection controls)
        {
            foreach (Control c in controls)
                if (c is Chart)
                    return ((Chart)(c));
                else
                {
                    var result = FindChart(c.Controls);
                    if (result != null)
                        return result;
                }
            return null;
        }

        protected override void OnLoad(EventArgs e)
        {
            var c = FindChart(Controls);
            if (c != null)
            {
                var aspectRatio = (c.Height.Value / c.Width.Value);
                var w = Request.Params["w"];
                if (!string.IsNullOrEmpty(w))
                {
                    c.Width = new Unit(w);
                    c.Height = new Unit((Convert.ToDouble(w) * aspectRatio));
                }
                DataBindChildren();
                var image = new MemoryStream();
                c.SaveImage(image, ChartImageFormat.Png);
                Response.Clear();
                Response.ContentType = "image/png";
                Response.OutputStream.Write(image.ToArray(), 0, ((int)(image.Length)));
                Response.End();
            }
        }
    }
}
