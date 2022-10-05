/*eslint eqeqeq: ["error", "smart"]*/
/*!
* Data Aquarium Framework - Classic UI
* Copyright 2008-2020 Code On Time LLC; Licensed MIT; http://codeontime.com/license
*/
(function () {
    Type.registerNamespace("Web");

    var _window = window,
        $window = $(_window),
        $document = $(document),
        _web = _window.Web,
        _Sys_Application = Sys.Application,
        _app = $app,
        userScope = '',
        _serializer = Sys.Serialization.JavaScriptSerializer,
        serialize = _serializer.serialize,
        sysBrowser = Sys.Browser,
        _jsExpRegex = /\{([\s\S]+?)\}/,
        dateTimeFormat = Sys.CultureInfo.CurrentCulture.dateTimeFormat,
        resources = _web.DataViewResources,
        resourcesMembership = _web.MembershipResources,
        resourcesData = Web.DataViewResources.Data,
        resourcesDataFilters = resourcesData.Filters,
        resourcesDataFiltersLabels = resourcesDataFilters.Labels,
        resourcesHeaderFilter = resources.HeaderFilter,
        resourcesModalPopup = resources.ModalPopup,
        resourcesPager = resources.Pager,
        resourcesMobile = resources.Mobile,
        resourcesFiles = resourcesMobile.Files,
        resourcesValidator = resources.Validator,
        resourcesActionsScopes = resources.Actions.Scopes,
        resourcesGrid = resources.Grid,
        labelSearch = resourcesGrid.PerformAdvancedSearch,
        labelClear = resourcesDataFiltersLabels.Clear,
        labelNullValueInForms = resourcesData.NullValueInForms,
        labelNullValue = resourcesData.NullValue,
        _wm,
        resourcesWhenLastCommandBatchEdit = resourcesActionsScopes.Form.Update.WhenLastCommandName.BatchEdit,
        findDataView,
        appBaseUrl, appServicePath,
        _touch, _geolocation, _locationWatchId,
        classicDataViewApi, classicMembershipApi,
        isBlank, isNullOrEmtpy;


    // declaration of methods specific to Classic UI (Legacy GUI of apps)

    classicDataViewApi = {
        survey: function (method) {
            var dataView = this,
                row, values;
            if (method === 'row') {
                row = [];
                values = dataView._collectFieldValues();
                dataView._validateFieldValues(values, false);
                $(values).each(function () {
                    var fv = this,
                        f = dataView.findField(fv.Name);
                    if (f)
                        row[f.Index] = fv.Modified ? fv.NewValue : fv.OldValue;
                });
                $(dataView._pendingUploads).each(function () {
                    var upload = this,
                        f = dataView.findField(upload.fieldName);
                    row[f.Index] = upload.files;
                });
                return row;
            }
            else if (method === 'data') {
                row = dataView.row();
                var obj = { _modified: {} },
                    allFields = dataView._allFields,
                    originalRow = dataView._originalRow;
                $(allFields).each(function (index) {
                    var f = this,
                        name = f.Name,
                        value;
                    index = f.Index;
                    if (!(name === 'sys_pk_' || name === 'Status' && index === allFields.length - 1)) {
                        value = obj[name] = row[index];
                        if (originalRow && originalRow[index] !== value)
                            obj._modified[name] = originalRow[index];
                    }
                });
                return obj;
            }
            else if (method === 'values')
                return dataView._collectFieldValues();
            return dataView._survey;
        },
        updateSummary: function () {
            if (!this.get_showInSummary() || _touch) return;
            var summaryBox = null;
            if (!this._summaryId) {
                var sideBar = $getSideBar();
                if (!sideBar) this._summaryId = '';
                else {
                    this._summaryId = 'PageSummary_' + this.get_id();
                    summaryBox = $get('PageSummaryBox');
                    if (!summaryBox) {
                        summaryBox = document.createElement('div');
                        summaryBox.id = 'PageSummaryBox';
                        summaryBox.className = 'TaskBox Summary';
                        summaryBox.innerHTML = String.format('<div class="Inner"><div class="Summary">{0}</div></div>', resources.Menu.Summary);
                        sideBar.insertBefore(summaryBox, sideBar.childNodes[sideBar._hasActivators ? 1 : 0]);
                        summaryBox._numberOfVisibleSummaries = 0;
                    }
                    var viewSummary = $get(this._summaryId);
                    if (!viewSummary) {
                        viewSummary = document.createElement('div');
                        viewSummary.id = this._summaryId;
                        summaryBox.childNodes[0].appendChild(viewSummary);
                    }
                }
            }
            if (this._summaryId) {
                if (!summaryBox) summaryBox = $get('PageSummaryBox');
                if (!this._rows || this._rows.length == 0) {
                    if (!this._filterSource)
                        Sys.UI.DomElement.setVisible(summaryBox, false);
                    return;
                }
                var row = this.get_selectedRow();
                viewSummary = $get(this._summaryId);
                var sb = new Sys.StringBuilder();
                var saveLastCommandName = this._lastCommandName;
                var saveViewType = this.get_view().Type;
                this.get_view().Type = 'Grid';
                this._lastCommandName = null;
                var empty = true;
                if (this._selectedKey.length > 0) {
                    var first = true;
                    var count = 0;
                    for (var i = 0; i < this._allFields.length; i++) {
                        var f = this._allFields[i];
                        if (f.ShowInSummary/* && !f.Hidden*/) {
                            empty = false;
                            sb.append('<div class="Field">');
                            if (first)
                                first = false;
                            else
                                sb.append('<div class="Divider"></div>');
                            sb.appendFormat('<div class="Label">{0}</div>', String.trimLongWords(this._allFields[f.AliasIndex].Label));
                            sb.append('<div class="Value">');
                            this._renderItem(sb, f, row, false, false, false, false, true);
                            sb.append('</div></div>');
                            count++;
                            if (this.get_summaryFieldCount() > 0 && count >= this.get_summaryFieldCount()) break;
                        }
                    }
                }
                Sys.UI.DomElement.setVisible(viewSummary, !empty);
                if (empty && this._summaryIsVisible)
                    summaryBox._numberOfVisibleSummaries--;
                else if (!empty && !this._summaryIsVisible || !empty && this._summaryIsVisible == null)
                    summaryBox._numberOfVisibleSummaries++;
                this._summaryIsVisible = !empty;
                Sys.UI.DomElement.setVisible(summaryBox, summaryBox._numberOfVisibleSummaries > 0);
                var s = sb.toString();
                viewSummary.innerHTML = s;
                var clearPermalink = this._lastArgs != this._lastClearArgs && this._lastArgs.CommandName === 'Delete';
                if (!_touch && (!empty || clearPermalink) && this.get_filterSource() == null && typeof Web.Membership != "undefined") {
                    if (clearPermalink) this._lastClearArgs = this._lastArgs;
                    Web.Membership._instance.addPermalink(String.format('{0}&_controller={1}&_commandName=Select&_commandArgument=editForm1', this.get_keyRef(), this.get_controller()), clearPermalink ? null : String.format('<div class="TaskBox" style="width:{2}px"><div class="Inner"><div class="Summary">{0}</div>{1}</div></div>', document.title, s, viewSummary.offsetWidth == 0 ? 135 : viewSummary.offsetWidth));
                }
                sb.clear();
                this._lastCommandName = saveLastCommandName;
                this.get_view().Type = saveViewType;
            }
        },
        _render: function (refreshExtension) {
            var that = this;
            that._restoreEmbeddedViews();
            that._detachBehaviors();
            that._disposeSearchBarExtenders();
            that._useLEVs();
            that._configure();
            that._internalRender();
            if (that._viewMessages)
                that.showViewMessage(that._viewMessages[that.get_viewId()]);
            that._raisePopulateDynamicLookups();
            if (!that.get_modalAnchor() && that.get_lookupField())
                that._focusQuickFind();
            that.raiseSelectedDelayed();
            if (that._scrollIntoView) {
                that._scrollIntoView = false;
                var bounds = $common.getBounds(that._element),
                    scrolling = _app.scrolling(); // $common.getScrolling();
                if (bounds.y < scrolling.y)
                    that._element.scrollIntoView(true);
            }
            that._incorporateEmbeddedViews();
            if (that.get_isModal())
                that._adjustModalPopupSize();
            if (that.get_searchOnStart() && that.get_isGrid() /*that.get_viewType() == 'Grid'*/) {
                that._focusSearchBar();
                that.set_searchOnStart(false);
            }
            if (that.get_isDataSheet()) {
                var fc = that._get_focusedCell();
                if (that.inserting() && !fc) {
                    that._startInputListenerOnCell(0, 0);
                }
                else if (fc && that._id === _app._activeDataSheetId) {
                    that._skipCellFocus = true;
                    that._focusCell(-1, -1, true);
                }
            }
            if (that.get_isGrid() && that._synced) {
                that._synced = false;
                if (that._selectedRowIndex == null) {
                    that._forgetSelectedRow(true);
                    that.refresh(true);
                }
            }
            that._syncKeyFilter();
        },
        _internalRender: function () {
            this._multipleSelection = null;
            this._dynamicActionButtons = false;
            var viewType = this.get_viewType(),
                sb = new Sys.StringBuilder(),
                isForm;
            if (this.get_mode() == Web.DataViewMode.Lookup) {
                var field = this._fields[0];
                var v = this.get_lookupText();
                if (v == null) v = resources.Lookup.SelectLink;
                var s = field.format(v);
                this._renderCreateNewBegin(sb, field);
                sb.appendFormat('<table cellpadding="0" cellspacing="0" class="DataViewLookup"><tr><td><a href="javascript:" onclick="$find(\'{0}\').showLookup({1});return false" class="Select" id="{0}_Item{1}_ShowLookupLink" title="{3}" tabindex="{7}"{8}>{2}</a><a href="#" class="Clear" onclick="$find(\'{0}\').clearLookupValue({1});return false" id="{0}_Item{1}_ClearLookupLink" title="{5}" tabindex="{7}">&nbsp;</a></td></tr></table><input type="hidden" id="{0}_Item{1}" value="{4}"/><input type="hidden" id="{0}_Text{1}" value="{6}"/>',
                    this.get_id(), field.Index, this.htmlEncode(field, s), String.format(resourcesLookup.SelectToolTip, field.Label), this.get_lookupValue(), String.format(resources.Lookup.ClearToolTip, field.Label), _app.htmlAttributeEncode(s), $nextTabIndex(), this.get_enabled() ? '' : ' disabled="true" class="Disabled"');
                this._renderCreateNewEnd(sb, field);
                this.get_element().appendChild(this._container);
                this._container.innerHTML = sb.toString();
                if (this.get_lookupValue() == '' || !this.get_enabled()) $get(this.get_id() + '_Item0_ClearLookupLink').style.display = 'none';
            }
            else {
                isForm = viewType == 'Form';
                sb.appendFormat('<table class="DataView {1}_{2}{3}{4} {5}Type" cellpadding="0" cellspacing="0"{0}>', this.get_isModal() ? String.format(' style="width:{0}px"', this._container.offsetWidth - 20) : '', this.get_controller(), this.get_viewId(), this._numberOfColumns > 0 ? ' MultiColumn' : '', this._tabs.length > 0 ? ' Tabbed' : '', viewType);
                if (isForm)
                    this._renderFormView(sb);
                else
                    this._renderGridView(sb);
                sb.append('</table>');
                if (this._mergedRow) {
                    var cell = this._get_focusedCell();
                    var inserting = this.inserting();
                    var isDataSheet = this.get_isDataSheet();
                    for (var i = 0; i < this._allFields.length; i++) {
                        var f = this._allFields[i];
                        var unfocusedCell = cell && i != this._fields[cell.colIndex].Index;
                        if (f.Hidden && (!f.IsPrimaryKey || inserting) || unfocusedCell || !cell && inserting && isDataSheet) {
                            v = this._mergedRow[i];
                            if (v != null || isDataSheet && !inserting/* || isDataSheet && (!f.IsPrimaryKey || !f.Hidden)*/)
                                sb.appendFormat('<input id="{0}_Item{1}" type="hidden" value="{2}"/>', this.get_id(), i, _app.htmlAttributeEncode(v != null ? f.format(v) : ''));
                        }
                    }
                }
                this._container.innerHTML = sb.toString();
                if (this._multipleSelection != null && this._multipleSelection == true)
                    $get(this.get_id() + '_ToggleButton').checked = true;
                this._attachBehaviors();
                this._updateVisibility();
                if (this.editing()) {
                    if (this._lastCommandName == 'BatchEdit')
                        $(this._element).find('div.BatchSelect input:checkbox:checked').each(function () {
                            _app._updateBatchSelectStatus(this, isForm);
                        });
                    this._focus();
                }
            }
            sb.clear();
            this._updateChart();
            this._updateSearchBar();
            this._removeRowUpdates();
            this._fixWidthOfColumns();
            this._fixHeightOfRow(true);
            this._refreshExtension();
        },
        _get_headerRowElement: function () {
            var rows = this._container.childNodes[0].childNodes[0].childNodes;
            var i = 0;
            while (i < rows.length) {
                if (Sys.UI.DomElement.containsCssClass(rows[i], 'HeaderRow'))
                    return rows[i];
                i++;
            }
            return null;
        },
        _fixWidthOfColumns: function () {
            if ((this.get_isDataSheet() || this.get_isGrid()) && !this.extension()) {
                var headerRow = this._get_headerRowElement();
                if (headerRow) {
                    if (!this._viewColumnSettings)
                        this._viewColumnSettings = [];
                    var fixedColumns = this._viewColumnSettings[this.get_viewId()];
                    if (!fixedColumns) {
                        fixedColumns = [];
                        $(headerRow).addClass('Fixed');
                        // first pass
                        for (var i = 0; i < headerRow.childNodes.length; i++) {
                            var cell = headerRow.childNodes[i];
                            var b = $common.getBounds(cell);
                            if (b.width == 0) {
                                Sys.UI.DomElement.removeCssClass(headerRow, 'Fixed');
                                return;
                            }
                            var pb = $common.getPaddingBox(cell);
                            var bb = $common.getBorderBox(cell);
                            var fc = { w: b.width - pb.horizontal - bb.horizontal, h: b.height - pb.vertical - bb.vertical };
                            Array.add(fixedColumns, fc);
                            //cell.style.width = fc.w + 'px';
                        }
                        var rowBounds = $common.getBounds(headerRow);
                        for (i = 0; i < fixedColumns.length; i++)
                            fixedColumns[i].h = rowBounds.height;
                        this._viewColumnSettings[this.get_viewId()] = fixedColumns;
                        Sys.UI.DomElement.removeCssClass(headerRow, 'Fixed');
                    }
                    //var hb = $common.getBounds(headerRow);
                    //headerRow.style.height = (fixedColumns[0].h - hb.horizontal) + 'px';
                    for (i = 0; i < headerRow.childNodes.length; i++) {
                        fc = fixedColumns[i];
                        if (fc) {
                            var headerCell = headerRow.childNodes[i];
                            headerCell.style.height = fc.h + 'px';
                            headerCell.style.width = fc.w + 'px';
                        }
                    }
                }
            }
        },
        _fixHeightOfRow: function (apply) {
            if ((this.get_isDataSheet() || this.get_isGrid()) && (!apply || this.editing())) {
                var headerRow = this._get_headerRowElement();
                if (!headerRow) return;
                var fc = this._get_focusedCell();
                var rowIndex = this.get_isGrid() ? this._selectedRowIndex : fc.rowIndex;
                if (rowIndex >= 0) {
                    var tBody = headerRow.parentNode;
                    for (var i = 0; i < tBody.childNodes.length; i++)
                        if (tBody.childNodes[i] == headerRow)
                            break;
                    var rowElem = tBody.childNodes[i + rowIndex + 1];
                    if (rowElem) {
                        if (apply) {
                            if (this._selectedRowHeight)
                                rowElem.style.height = this._selectedRowHeight + 'px';
                            //                        if (this._selectedRowHeight)
                            //                            for (i = 0; i < rowElem.childNodes.length; i++) {
                            //                                rowElem.childNodes[i].style.height = (this._selectedRowHeight - 7) + 'px';
                            //                            }
                        }
                        else {
                            var b = $common.getBounds(rowElem);
                            this._selectedRowHeight = b.height;
                        }
                    }
                }
            }
        },
        _updateChart: function () {
            if (this.get_isChart()) {
                var chart = this._get('$Chart');
                var w = chart.offsetWidth;
                if (w < 100)
                    w = chart.parentNode.offsetWidth;
                var pageRequest = this._createParams();
                //delete pageRequest.Transaction;
                delete pageRequest.LookupContextFieldName;
                delete pageRequest.LookupContextController;
                delete pageRequest.LookupContextView;
                delete pageRequest.LookupContext;
                delete pageRequest.LastCommandName;
                delete pageRequest.LastCommandArgument;
                delete pageRequest.Inserting;
                delete pageRequest.DoesNotRequireData;
                var r = serialize(pageRequest);
                //var chartBounds = $common.getBounds(chart);
                //if (chartBounds.height > 0 && !isNullOrEmpty(chart.src))
                //    chart.style.height = chartBounds.height + 'px';
                var that = this;
                if (that._chartHeight)
                    chart.style.height = that._chartHeight + 'px';
                //chart.src = String.format('{0}ChartHost.aspx?c={1}_{2}&w={3}&r={4}', this.get_baseUrl(), this.get_controller(), this.get_viewId(), w, encodeURIComponent(r));
                $(chart).one('load', function () {
                    try {
                        //alert($(this).height());
                        that._chartHeight = $(this).height();
                    }
                    catch (ex) {
                        // do nothing
                    }
                }).attr('src', String.format('{0}ChartHost.aspx?c={1}_{2}&w={3}&r={4}', this.get_baseUrl(), this.get_controller(), this.get_viewId(), w, encodeURIComponent(r)));

            }
        },
        _toggleCategoryVisibility: function (categoryIndex, visible) {
            var categoryFields = $get(String.format('{0}$Category${1}', this.get_id(), categoryIndex));
            if (categoryFields) {
                var cat = this.get_categories()[categoryIndex];
                if (!visible) visible = !Sys.UI.DomElement.getVisible(categoryFields);
                //Sys.UI.DomElement.setVisible(categoryFields, visible);
                $(categoryFields).css('display', visible ? '' : 'none');
                var button = $get(String.format('{0}$CategoryButton${1}', this.get_id(), categoryIndex));
                cat.Collapsed = !visible;
                if (visible) {
                    Sys.UI.DomElement.removeCssClass(button, 'Maximize');
                    button.childNodes[0].title = resources.Form.Minimize;
                }
                else {
                    $(button).addClass('Maximize');
                    button.childNodes[0].title = resources.Form.Maximize;
                }
                _body_performResize();
            }
        },
        _processTemplatedText: function (row, text) {
            if (!text) text = '';
            var iterator = /\{(\w+)\}/g;
            var m = iterator.exec(text);
            if (!m) return text;
            var sb = new Sys.StringBuilder();
            var index = 0;
            while (m) {
                sb.append(text.substring(index, m.index));
                var fieldName = m[1];
                index = m.index + fieldName.length + 2;
                var field = this.findField(fieldName);
                if (field) {
                    sb.append('<span class="FieldPlaceholder">');
                    this._renderItem(sb, field, row, false, false, false, false, false, true);
                    sb.append('</span>');
                }
                else
                    sb.appendFormat('[{0}]', fieldName);
                m = iterator.exec(text);
            }
            var lastIndex = text.length - 1;
            if (index < lastIndex)
                sb.append(text.substring(index, lastIndex));
            return sb.toString().replace(/ (id|for)=\".+?\"/g, '');
        },
        _get_selectedTab: function () {
            return this._tabs.length > 0 ? this._tabs[this.get_categoryTabIndex()] : null;
        },
        _renderFormView: function (sb) {
            var isEditing = this.editing();
            this._renderStatusBar(sb);
            this._renderViewDescription(sb);
            if (resources.Form.ShowActionBar) this._renderActionBar(sb);
            var row = this.get_currentRow();
            this._mergeRowUpdates(row);
            this._updateVisibility(row);
            if (this.inserting() && this._expressions) {
                for (i = 0; i < this._expressions.length; i++) {
                    var exp = this._expressions[i];
                    if (exp.Scope == Web.DynamicExpressionScope.DefaultValues && exp.Type == Web.DynamicExpressionType.ClientScript) {
                        f = this.findField(exp.Target);
                        if (f && row[f.Index] == null) {
                            if (isNullOrEmpty(exp.Test))
                                row[f.Index] = exp.Result;
                            else {
                                var r = eval(exp.Test);
                                if (r)
                                    row[f.Index] = isNullOrEmpty(exp.Result) ? r : exp.Result;
                            }
                        }
                    }
                }
            }
            var fieldCount = 0;
            for (i = 0; i < this._allFields.length; i++)
                if (!this._allFields[i].Hidden) fieldCount++;
            var hasButtonsOnTop = /*fieldCount > Web.DataViewResources.Form.SingleButtonRowFieldLimit && */row != null;
            if (hasButtonsOnTop) this._renderActionButtons(sb, 'Top', 'Form');
            var selectedTab = this._get_selectedTab(); //this._tabs.length > 0 ? this._tabs[this.get_categoryTabIndex()] : null;
            if (this._tabs.length > 0) {
                sb.appendFormat('<tr class="TabsRow"><td colspan="{0}" class="TabsBar{1}">', this._get_colSpan(), !hasButtonsOnTop ? ' WithMargin' : '');
                sb.append('<table cellpadding="0" cellspacing="0" class="Tabs"><tr>');
                for (i = 0; i < this._tabs.length; i++)
                    sb.appendFormat('<td id="{2}_Tab{3}" class="Tab{1}" onmouseover="$hoverTab(this,true)" onmouseout="$hoverTab(this,false)"><span class="Outer"><span class="Inner"><span class="Tab"><a href="javascript:" onclick="$find(&quot;{2}&quot;).set_categoryTabIndex({3});return false;" onfocus="$hoverTab(this,true)" onblur="$hoverTab(this,false)" tabindex="{4}">{0}</a></span></span></span></td>', _app.htmlEncode(this._tabs[i]), i == this.get_categoryTabIndex() ? ' Selected' : '', this.get_id(), i, $nextTabIndex());
                sb.append('</tr></table></td></tr>');
            }
            if (!row) this._renderNoRecordsWhenNeeded(sb);
            else {
                var t = this._get_template();
                if (t) {
                    sb.appendFormat('<tr class="CategoryRow"><td valign="top" class="Fields" colspan="{0}">', this._get_colSpan());
                    this._renderTemplate(t, sb, row, true, false);
                    sb.append('</td></tr>');
                }
                else {
                    var categories = this.get_categories();
                    var fields = this.get_fields();
                    var numCols = this._numberOfColumns;
                    if (numCols > 0) {
                        sb.appendFormat('<tr class="Categories"><td class="Categories" colspan="{0}"><table class="Categories"><tr class="CategoryRow">', this._get_colSpan());
                        for (var k = 0; k < numCols; k++) {
                            if (k > 0)
                                sb.append('<td class="CategorySeparator">&nbsp;</td>');
                            sb.appendFormat('<td class="CategoryColumn" valign="top" style="width:{0}%">', 100 / numCols);
                            for (i = 0; i < categories.length; i++) {
                                var c = categories[i];
                                if (c.ColumnIndex == k || this._ignoreColumnIndex) {
                                    if (this.get_isModal()) c.Collapsed = false;
                                    sb.appendFormat('<div id="{0}_Category{1}" class="Category {3}" style="display:{2}">', this.get_id(), i, !selectedTab || selectedTab == c.Tab ? 'block' : 'none', c.Id);
                                    var description = this._processTemplatedText(row, c.Description);
                                    var descriptionText = this._formatViewText(resources.Views.DefaultCategoryDescriptions[description], true, description);
                                    sb.appendFormat('<table class="Category {8}" cellpadding="0" cellspacing="0"><tr><td class="HeaderText"><span class="Text">{0}</span><a href="javascript:" class="MinMax{6}" onclick="$find(\'{2}\')._toggleCategoryVisibility({3});return false;" id="{2}$CategoryButton${3}" style="{5}"><span title="{4}"></span></a><div style="clear:both;height:1px;margin-top:-1px;"></div></td></tr><tr><td class="Description" id="{2}$CategoryDescription${3}" style="display:{7}">{1}</td></tr></table>',
                                        c.HeaderText, descriptionText,
                                        this.get_id(), i, c.Collapsed ? resources.Form.Maximize : resources.Form.Minimize,
                                        categories.length > 1 && !this.get_isModal() ? '' : 'display:none', c.Collapsed ? ' Maximize' : '', isNullOrEmpty(descriptionText) ? 'none' : 'block', c.Id);
                                    var skip = true;
                                    for (j = 0; j < fields.length; j++) {
                                        var field = fields[j];
                                        if (!field.Hidden && field.CategoryIndex == c.Index) {
                                            skip = false;
                                            break;
                                        }
                                    }
                                    if (!skip) {
                                        sb.appendFormat('<table class="Fields" id="{0}$Category${1}" style="{2}"><tr class="FieldsRow"><td class="Fields" valign="top" width="100%">', this.get_id(), i, c.Collapsed ? 'display:none' : '');
                                        if (!isNullOrEmpty(c.Template))
                                            this._renderTemplate(c.Template, sb, row, true, false);
                                        else {
                                            for (j = 0; j < fields.length; j++) {
                                                field = fields[j];
                                                if (!field.Hidden && field.CategoryIndex == c.Index) {
                                                    var m = field.Name.match(/^(_[A-Za-z_]+)\d/);
                                                    sb.appendFormat('<table cellpadding="0" cellspacing="0" class="FieldWrapper {0}"><tr class="FieldWrapper"><td class="Header" valign="top">', m ? m[1] : field.Name);
                                                    this._renderItem(sb, field, row, true, false, false, true);
                                                    sb.appendFormat('</td><td class="Item{0}" valign="top">', isEditing && !field.isReadOnly() ? '' : ' ReadOnly');
                                                    this._renderItem(sb, field, row, true);
                                                    sb.append('</td></tr></table>');
                                                }
                                            }
                                        }
                                        sb.append('</td></tr></table>');
                                    }
                                    sb.append('</div>');
                                }
                            }
                            sb.append('</td>');
                        }
                        sb.append('</tr></table></td></tr>');
                    }
                    else {
                        for (i = 0; i < categories.length; i++) {
                            c = categories[i];
                            description = this._processTemplatedText(row, c.Description);
                            sb.appendFormat('<tr class="CategoryRow {5}" id="{2}_Category{3}" style="display:{4}"><td valign="top" class="Category {5}"><table class="Category {5}" cellpadding="0" cellspacing="0"><tr><td class="HeaderText">{0}</td></tr><tr><td class="Description" id="{2}$CategoryDescription${3}">{1}</td></tr></table></td><td valign="top" class="Fields {5}">',
                                c.HeaderText, this._formatViewText(resources.Views.DefaultCategoryDescriptions[description], true, description), this.get_id(), i, !selectedTab || selectedTab == c.Tab ? '' : 'none', c.Id);
                            if (!isNullOrEmpty(c.Template))
                                this._renderTemplate(c.Template, sb, row, true, false);
                            else {
                                for (j = 0; j < fields.length; j++) {
                                    field = fields[j];
                                    if (!field.Hidden && field.CategoryIndex == c.Index)
                                        this._renderItem(sb, field, row, true);
                                }
                            }
                            sb.append('</td></tr>');
                        }
                    }
                }
            }
            if (row) this._renderActionButtons(sb, 'Bottom', 'Form');
        },
        _updateTabbedCategoryVisibility: function () {
            if (this._tabs && this._tabs.length > 0) {
                var tab = this._tabs[this.get_categoryTabIndex()];
                for (var i = 0; i < this._tabs.length; i++) {
                    var elem = this._get('_Tab', i); //$get(String.format('{0}_Tab{1}', this.get_id(), i));
                    if (elem) {
                        if (i == this.get_categoryTabIndex())
                            $(elem).addClass('Selected');
                        else
                            $(elem).removeClass('Selected');
                    }
                }
                for (i = 0; i < this._categories.length; i++) {
                    var c = this._categories[i];
                    elem = this._get('_Category', i); // $get(String.format('{0}_Category{1}', this.get_id(), i));
                    if (elem) Sys.UI.DomElement.setVisible(elem, c.Tab == tab);
                }
                this._updateVisibility();
            }
            this._adjustModalHeight();
        },
        _renderItem: function (sb, field, row, isSelected, isInlineForm, isFirstRow, headerOnly, trimLongWords, templateMode) {
            var isForm = this.get_isForm()/* this.get_view().Type == 'Form'*/ || isInlineForm;
            var v = row[field.Index];
            if (v != null) v = v.toString();
            var checkBox = null,
                isCheckBoxList = field.ItemsStyle == 'CheckBoxList',
                isEditing = this.editing(),
                hasAlias = field.Index != field.AliasIndex,
                undefinedLookup = hasAlias && !field.ItemsStyle;
            if (isEditing && field.ItemsStyle == 'CheckBox' && field.Items.length == 2) {
                var fv = field.Items[0][0];
                var tv = field.Items[1][0];
                if (fv == 'true') {
                    fv = 'false';
                    tv = 'true';
                }
                if (v == null) v = field.Items[0][0];
                checkBox = String.format('<input type="checkbox" id="{0}_Item{1}"{2} tabindex="{3}" value="{4}" onclick="this.value=this.checked?\'{6}\':\'{5}\';$find(&quot;{0}&quot;)._valueChanged({1});" onfocus="$find(&quot;{0}&quot;)._valueFocused({1});" title="{7}"/>',
                    this.get_id(), field.Index, tv && (v == 'true' || v == tv) ? ' checked' : '', $nextTabIndex(), v, fv, tv, field.ToolTip);
            }
            var readOnly = field.isReadOnly(); // field.ReadOnly || field.TextMode == 4;
            if (isForm) {
                var errorHtml = String.format('<div class="Error" id="{0}_Item{1}_Error" style="display:none"></div>', this.get_id(), field.Index);
                if (!headerOnly) sb.appendFormat('<div class="Item {2}" id="{0}_ItemContainer{1}">', this.get_id(), field.Index, field.Name);
                //if (this._numberOfColumns == 0) sb.append(errorHtml);
                var headerText = (isEditing && undefinedLookup ? this.findFieldUnderAlias(field) : this._allFields[field.AliasIndex]).HeaderText;
                if (checkBox && headerOnly && !(isEditing && readOnly)) {
                    sb.append('<div class="Header">&nbsp;</div>');
                    return;
                }
                if (headerText.length > 0)
                    if (templateMode && checkBox && this._numberOfColumns > 0)
                        sb.append('<div class="Header">&nbsp;</div>');
                    else
                        sb.appendFormat('<div class="Header {5}">{3}<label for="{0}_Item{1}">{2}{4}</label></div>',
                            this.get_id(), field.Index, headerText,
                            this._numberOfColumns > 0 || templateMode ? '' : checkBox,
                            isEditing && !field.AllowNulls && !checkBox && !readOnly && resources.Form.RequiredFieldMarker ? resources.Form.RequiredFieldMarker : '',
                            field.Name);
                if (headerOnly) return;
                if (checkBox == null || this._numberOfColumns > 0)
                    sb.append('<div class="Value">');
            }
            var needObjectRef = !isEditing && !isNullOrEmpty(field.ItemsDataController) && !isCheckBoxList && !isFirstRow && v && this._disableObjectRef != true && !field.tagged('lookup-details-hidden');
            if (needObjectRef && !isForm) sb.append('<table width="100%" cellpadding="0" cellspacing="0" class="ObjectRef"><tr><td>');
            if (isEditing && isSelected && !readOnly) {
                if (undefinedLookup)
                    field = this.findFieldUnderAlias(field);
                var batchEditField = field;
                if (field._LEV != null)
                    sb.append('<table cellpadding="0" cellspacing="0"><tr><td>');
                if (!isForm && checkBox) sb.append(checkBox);
                var hasItemsStyle = !isNullOrEmpty(field.ItemsStyle);
                var isLookup = field.ItemsStyle == 'Lookup';
                var hasContextFields = !isNullOrEmpty(field.ContextFields);
                var isAutoComplete = field.ItemsStyle == 'AutoComplete';
                var lov = field.DynamicItems ? field.DynamicItems : field.Items,
                    isStaticList = hasItemsStyle && !isLookup && !isAutoComplete;
                if (isStaticList && (lov.length == 0 && !isCheckBoxList) && hasContextFields) {
                    lov = [];
                    if ((field.AllowNulls || v == null) || hasContextFields)
                        Array.add(lov, ['', labelNullValueInForms]);
                    if (v != null)
                        Array.add(lov, [v, row[field.AliasIndex]]);
                }
                else if (field.DynamicItems && !isCheckBoxList) {
                    var hasValue = false;
                    for (var i = 0; i < lov.length; i++) {
                        if (lov[i][0] == v) {
                            hasValue = true;
                            break;
                        }
                    }
                    //if (!hasValue && !isNullOrEmpty(v)) Array.insert(lov, 0, [v, row[field.AliasIndex]]);
                    if (!hasValue) v = null;
                    if ((field.AllowNulls || !hasValue) && !isNullOrEmpty(lov[0][0]))
                        Array.insert(lov, 0, ['', labelNullValueInForms]);
                }
                else if (isStaticList && !field.AllowNulls && v == null && !isCheckBoxList && lov.length && lov[0][0] != null) {
                    lov = lov.slice(0);
                    lov.splice(0, 0, ['', labelNullValueInForms]);
                }
                if (checkBox != null) {
                    if (this._numberOfColumns > 0 || templateMode) {
                        sb.append(checkBox);
                        sb.appendFormat('<label for="{0}_Item{1}" title="{3}">{2}</label>', this.get_id(), field.Index, headerText, field.ToolTip);
                    }
                }
                else
                    if (lov.length > 0 || isCheckBoxList || hasItemsStyle && !isLookup && !isAutoComplete) {
                        if (field.ItemsStyle == 'RadioButtonList') {
                            sb.appendFormat('<table cellpadding="0" cellspacing="0" class="RadioButtonList" title="{0}">', field.ToolTip);
                            var columns = field.Columns == 0 ? 1 : field.Columns;
                            var rows = Math.floor(lov.length / columns) + (lov.length % columns > 0 ? 1 : 0);
                            for (var r = 0; r < rows; r++) {
                                sb.append('<tr>');
                                for (var c = 0; c < columns; c++) {
                                    var itemIndex = c * rows + r; //r * columns + c;
                                    if (itemIndex < lov.length) {
                                        var item = lov[itemIndex];
                                        var itemValue = item[0] == null ? '' : item[0].toString();
                                        if (v == null) v = '';
                                        sb.appendFormat(
                                            '<td class="Button"><input type="radio" id="{0}_Item{1}_{2}" name="{0}_Item{1}" value="{3}"{4} tabindex="{6}" onclick="$find(&quot;{0}&quot;)._valueChanged({1})" onfocus="$find(&quot;{0}&quot;)._valueFocused({1});"/></td><td class="Option"><label for="{0}_Item{1}_{2}">{5}<label></td>',
                                            this.get_id(), field.Index, itemIndex, itemValue, itemValue == v ? " checked" : "", this.htmlEncode(field, item[1]), $nextTabIndex());
                                    }
                                    else
                                        sb.append('<td class="Button">&nbsp;</td><td class="Option"></td>');
                                }
                                sb.append('</tr>');
                            }
                            sb.append('</table>');
                        }
                        else if (isCheckBoxList) {
                            var lov2 = (v ? v.split(',') : []);
                            var waitingForDynamicItems = !isNullOrEmpty(field.ContextFields) && !field.DynamicItems;
                            sb.appendFormat('<input type="hidden" id="{0}_Item{1}" name="{0}_Item{1}" value="{2}"/>', this.get_id(), field.Index, waitingForDynamicItems ? v : '');
                            if (waitingForDynamicItems)
                                sb.append(resourcesHeaderFilter.Loading);
                            else {
                                sb.appendFormat('<table cellpadding="0" cellspacing="0" class="RadioButtonList" title="{0}">', field.ToolTip);
                                columns = field.Columns == 0 ? 1 : field.Columns;
                                rows = Math.floor(lov.length / columns) + (lov.length % columns > 0 ? 1 : 0);
                                for (r = 0; r < rows; r++) {
                                    sb.append('<tr>');
                                    for (c = 0; c < columns; c++) {
                                        itemIndex = c * rows + r; //r * columns + c;
                                        if (itemIndex < lov.length) {
                                            item = lov[itemIndex];
                                            itemValue = item[0] == null ? '' : item[0].toString();
                                            if (v == null) v = '';
                                            sb.appendFormat(
                                                '<td class="Button"><input type="checkbox" id="{0}_Item{1}_{2}" name="{0}_Item{1}" value="{3}"{4} tabindex="{6}"  onclick="$find(&quot;{0}&quot;)._valueChanged({1})" onfocus="$find(&quot;{0}&quot;)._valueFocused({1});"/></td><td class="Option"><label for="{0}_Item{1}_{2}">{5}<label></td>',
                                                this.get_id(), field.Index, itemIndex, itemValue, Array.indexOf(lov2, itemValue) != -1 ? " checked" : "", this.htmlEncode(field, item[1]), $nextTabIndex());
                                        }
                                        else
                                            sb.append('<td class="Button">&nbsp;</td><td class="Option"></td>');
                                    }
                                    sb.append('</tr>');
                                }
                                sb.append('</table>');
                            }
                        }
                        else {
                            sb.appendFormat('<select id="{0}_Item{1}" size="{2}" tabindex="{3}" onchange="$find(&quot;{0}&quot;)._valueChanged({1});" onfocus="$find(&quot;{0}&quot;)._valueFocused({1});" title="{4}">', this.get_id(), field.Index, field.ItemsStyle == 'ListBox' ? (field.Rows == 0 ? 5 : field.Rows) : '1', $nextTabIndex(), field.ToolTip);
                            if (v == null) v = '';
                            v = v.toString();
                            for (i = 0; i < lov.length; i++) {
                                item = lov[i];
                                itemValue = item[0];
                                var itemText = itemValue == null && !field.AllowNulls ? resources.Lookup.SelectLink : item[1];
                                if (itemValue == null) itemValue = '';
                                itemValue = itemValue.toString();
                                sb.appendFormat('<option value="{0}"{1}>{2}</option>', itemValue, itemValue == v ? ' selected' : '', this.htmlEncode(field, itemText));
                            }
                            sb.append('</select>');
                        }
                    }
                    else if (!isNullOrEmpty(field.ItemsDataController) && isLookup) {
                        v = row[field.AliasIndex];
                        if (v == null) v = resources.Lookup.SelectLink;
                        var s = this._allFields[field.AliasIndex].format(v);
                        this._renderCreateNewBegin(sb, field);
                        sb.appendFormat('<table cellpadding="0" cellspacing="0" class="Lookup"><tr><td><a href="#" onclick="$find(\'{0}\').showLookup({1});return false" id="{0}_Item{1}_ShowLookupLink" title="{3}" tabindex="{5}">{2}</a><a href="#" class="Clear" onclick="$find(\'{0}\').clearLookupValue({1});return false" id="{0}_Item{1}_ClearLookupLink" title="{7}" tabindex="{6}" style="display:{8}">&nbsp;</a></td></tr></table><input type="hidden" id="{0}_Item{1}" value="{4}"/><input type="hidden" id="{0}_Item{9}" value="{2}"/>',
                            this.get_id(), field.Index, this.htmlEncode(field, s), !isNullOrEmpty(field.ToolTip) ? field.ToolTip : String.format(resources.Lookup.SelectToolTip, field.Label), row[field.Index], $nextTabIndex(), $nextTabIndex(), String.format(resources.Lookup.ClearToolTip, field.Label), row[field.Index] != null ? 'display' : 'none', field.AliasIndex);
                        this._renderCreateNewEnd(sb, field);
                    }
                    else if (field.OnDemand) this._renderOnDemandItem(sb, field, row, isSelected, isForm);
                    else if (field.Editor) {
                        var editor = field.Editor;
                        sb.appendFormat('<input type="hidden" id="{0}_Item{1}" value="{2}"/>', this.get_id(), field.Index, _app.htmlAttributeEncode(v));
                        sb.appendFormat('<iframe src="{0}?id={1}_Item{2}&control={3}" frameborder="0" scrolling="no" id="{1}_Item{2}$Frame" class="FieldEditor {3}" tabindex="{4}"></iframe>', this.resolveClientUrl(this.get_appRootPath() + 'ControlHost.aspx'), this.get_id(), field.Index, editor, $nextTabIndex());
                    }
                    else if (field.Rows > 1) {
                        sb.appendFormat('<textarea id="{0}_Item{1}" tabindex="{2}" onchange="$find(&quot;{0}&quot;)._valueChanged({1})" onfocus="$find(&quot;{0}&quot;)._valueFocused({1});" title="{3}" style="', this.get_id(), field.Index, $nextTabIndex(), field.ToolTip);
                        if (field.TextMode == 3 && !isNullOrEmpty(v))
                            sb.append('display:none;');
                        if (!isForm)
                            sb.append('display:block;width:100%;"');
                        else
                            sb.appendFormat('" cols="{0}"', field.Columns > 0 ? field.Columns : 50);
                        sb.appendFormat(' rows="{0}"', field.Rows);
                        if (_app.supportsPlaceholder && !isNullOrEmpty(field.Watermark))
                            sb.appendFormat(' placeholder="{0}"', _app.htmlAttributeEncode(field.Watermark));
                        sb.append('>');
                        sb.append(field.HtmlEncode ? this.htmlEncode(field, v) : v);
                        sb.append('</textarea>');
                        if (field.TextMode == 3 && !isNullOrEmpty(v))
                            sb.appendFormat('<div>{2}<div><a href="javascript:" onclick="var o=$get(\'{0}_Item{1}\');o.style.display=\'block\';o.focus();this.parentNode.parentNode.style.display=\'none\';return false;">{3}</a> | <a href="javascript:" onclick="if(!confirm(\'{5}\'))return;$get(\'{0}_Item{1}\').value=\'\';this.parentNode.parentNode.parentNode.parentNode.style.display=\'none\';return false;">{4}</a></div></div>', this.get_id(), field.Index, this.htmlEncode(field, v).replace(/((\r\n*)|\n)/g, '<br/>'), resourcesData.NoteEditLabel, resourcesData.NoteDeleteLabel, resourcesData.NoteDeleteConfirm);
                    }
                    else {
                        columns = field.Columns > 0 ? field.Columns : 50;
                        var autoCompleteTooltip = field.ToolTip;
                        if (isAutoComplete && (!hasAlias || isEditing)) {
                            v = row[field.Index];
                            sb.appendFormat('<input type="hidden" id="{0}_Item{1}" value="{2}"/>', this.get_id(), field.Index, _app.htmlAttributeEncode(v));
                            field = this._allFields[field.AliasIndex];
                        }
                        if (field.TimeFmtStr)
                            sb.append('<table cellpadding="0" cellspacing="0" class="DateTime"><tr><td class="Date">');
                        sb.appendFormat('<input type="{3}" id="{0}_Item{1}" tabindex="{2}" onchange="$find(&quot;{0}&quot;)._valueChanged({1})" onfocus="$find(&quot;{0}&quot;)._valueFocused({1});"', this.get_id(), field.Index, $nextTabIndex(), field.TextMode != 1 ? 'text' : 'password');
                        if (!isForm)
                            sb.append(' style="display:block;width:90%;"');
                        else
                            sb.appendFormat(' size="{0}"', columns);
                        if (field.Len > 0)
                            sb.appendFormat(' maxlength="{0}"', field.Len);
                        if (isAutoComplete)
                            sb.appendFormat(' title="{0}"', autoCompleteTooltip);
                        v = row[field.Index];
                        if (v == null)
                            s = isAutoComplete ? labelNullValueInForms : '';
                        else if (hasAlias)
                            s = v.toString();
                        else {
                            if (field.DateFmtStr) {
                                if (typeof v == 'string')
                                    v = Date.parseLocale(v, field.DataFormatString.match(/\{0:([\s\S]*?)\}/)[1]);
                                field.DataFormatString = field.DateFmtStr;
                            }
                            s = field.format(v);
                            if (field.DateFmtStr)
                                field.DataFormatString = field.DataFmtStr;
                        }
                        sb.appendFormat(' value="{0}" {1}', _app.htmlAttributeEncode(s), isForm ? ' class="TextInput"' : String.format('class="TextInput {0}Type"', field.Type));
                        sb.appendFormat(' title="{0}"', field.ToolTip);
                        if (_app.supportsPlaceholder && !isNullOrEmpty(field.Watermark))
                            sb.appendFormat(' placeholder="{0}"', _app.htmlAttributeEncode(field.Watermark));
                        sb.append('/>');
                        if (field.Type.startsWith('DateTime') && isForm && resources.Form.ShowCalendarButton && !field.TimeFmtStr)
                            sb.appendFormat('<a id="{0}_Item{1}_Button" href="#" onclick="return false" class="Calendar">&nbsp;</a>', this.get_id(), field.Index);
                        if (field.TimeFmtStr) {
                            sb.appendFormat('</td><td class="Time"><input type="text" id="{0}_Item$Time{1}" tabindex="{2}" onchange="$find(&quot;{0}&quot;)._valueChanged({1})" onfocus="$find(&quot;{0}&quot;)._valueFocused({1});"', this.get_id(), field.Index, $nextTabIndex());
                            if (!isForm)
                                sb.append(' style="display:block;width:90%;"');
                            else
                                sb.appendFormat(' size="{0}"', columns);
                            if (v == null)
                                s = isAutoComplete ? labelNullValueInForms : '';
                            else if (hasAlias)
                                s = v.toString();
                            else {
                                field.DataFormatString = field.TimeFmtStr;
                                s = field.format(v);
                                field.DataFormatString = field.DataFmtStr;
                            }
                            sb.appendFormat(' value="{0}" {1}/></td></table>', _app.htmlAttributeEncode(s), isForm ? '' : 'class="TimeType"');
                        }
                    }
                if (field._LEV != null) {
                    var lev = this._allFields[field.AliasIndex]._LEV;
                    if (lev == null) lev = '';
                    sb.appendFormat('</td><td class="UseLEV"><a href="javascript:" onclick="$find(\'{0}\')._applyLEV({1});return false" tabindex="{2}" title="{3}">&nbsp;</a></td></tr></table>', this.get_id(), field.Index, $nextTabIndex(), _app.htmlAttributeEncode(String.format(resourcesData.UseLEV, this._allFields[field.AliasIndex].format(lev))));
                }
                if (this._lastCommandName == 'BatchEdit')
                    sb.appendFormat('<div class="BatchSelect"><table cellpadding="0" cellspacing="0"><tr><td><input type="checkbox" id="{0}$BatchSelect{1}" onclick="$app._updateBatchSelectStatus(this,{3})"{4}/></td><td><label for="{0}$BatchSelect{1}">{2}</a></td></tr></table></div>',
                        this.get_id(), batchEditField.Index, resourcesData.BatchUpdate, isForm == true, this._batchEdit && Array.contains(this._batchEdit, batchEditField.Name) ? ' checked="checked"' : '');
            }
            else {
                if (field.OnDemand) this._renderOnDemandItem(sb, field, row, isSelected, isForm);
                else {
                    v = this.htmlEncode(field, row[field.AliasIndex]);
                    if (isEditing)
                        if (readOnly && isSelected) {
                            var hv = row[field.Index]; //row[field.ReadOnly ? field.AliasIndex : field.Index];
                            sb.appendFormat('<input type="hidden" id="{0}_Item{1}" value="{2}"/>', this.get_id(), field.Index, hv != null ? _app.htmlAttributeEncode(this._allFields[field.AliasIndex].format(hv)) : '');
                        }
                    var fieldItems = field.DynamicItems ? field.DynamicItems : field.Items;
                    if (fieldItems.length == 0) {
                        if (field.Type == 'String' && v != null && v.length > resourcesData.MaxReadOnlyStringLen && !(field.TextMode == 3 || field.TextMode == 2))
                            v = v.substring(0, resourcesData.MaxReadOnlyStringLen) + '...';
                        if (v && field.TextMode == 3)
                            v = v.replace(/\r?\n/g, '<br/>');
                        s = isBlank(v) ? (isForm ? labelNullValueInForms : labelNullValue) : this._allFields[field.AliasIndex].format(v);
                    }
                    else if (isCheckBoxList) {
                        lov = v ? v.split(',') : [];
                        var fi = true;
                        for (i = 0; i < fieldItems.length; i++) {
                            item = fieldItems[i];
                            itemValue = item[0] == null ? '' : item[0].toString();
                            if (Array.contains(lov, itemValue)) {
                                if (fi) fi = false; else sb.append(', ');
                                sb.append(_app.htmlEncode(item[1]));
                            }
                        }
                        s = lov.length == 0 ? labelNullValueInForms : '';
                    }
                    else if (hasAlias && !isSelected)
                        s = v;
                    else {
                        item = this._findItemByValue(field, !hasAlias ? v : row[field.Index]);
                        s = item[1];
                        if (!isForm && s == labelNullValueInForms)
                            s = labelNullValue;
                    }
                    if (!isNullOrEmpty(field.HyperlinkFormatString) && v != null) {
                        var location = this._parseLocation(field.HyperlinkFormatString, row);
                        //var m = location.match(_app.LocationRegex);
                        //s = m ? String.format('<a href="javascript:" onclick="_app._navigated=true;window.open(\'{0}\', \'{1}\');return false;">{2}</a>', m[2].replace(/\'/g, '\\\'').replace(/"/g, '&quot;'), m[1], s) : String.format('<a href="{0}" onclick="_app._navigated=true;">{1}</a>', location, s);
                        if (location && location.match(/^mailto\:/))
                            s = String.format('<a href="{0}" title="{2}">{1}</a>', location, s, field.ToolTip);
                        else if (location.match(/^javascript\:/))
                            s = String.format('<a href="javascript:" onclick="{0};return false;" title="{2}">{1}</a>', location.substring(11), s, field.ToolTip);
                        else
                            s = String.format('<a href="javascript:" onclick="$find(\'{2}\')._navigate(\'{0}\');" title="{3}">{1}</a>', location, s, this.get_id(), field.ToolTip);
                    }
                    if (field.TextMode == 1) s = '**********';
                    if (field.Type == 'Byte[]' && !field.OnDemand)
                        s = _app.toHexString(s);
                    if (trimLongWords == true)
                        s = String.trimLongWords(s);
                    if (__designer() && typeof s == 'string')
                        s = s.replace(/\^\w+\^/g, '');
                    sb.append(s);
                }
            }
            if (needObjectRef) {
                if (!isForm) sb.append('</td><td align="right">');
                sb.appendFormat('<span class="ObjectRef" title="{0}" onclick="$find(&quot;{1}&quot;).executeCommand({{commandName: &quot;_ViewDetails&quot;, commandArgument: &quot;{2}&quot;}})">&nbsp;</span>',
                    String.format(resources.Lookup.DetailsToolTip, _app.htmlAttributeEncode(this._allFields[field.AliasIndex].HeaderText)), this.get_id(), field.Name);
                if (!isForm) sb.append('</td></tr></table>');
            }
            if (isForm) {
                if (checkBox == null || this._numberOfColumns > 0)
                    sb.append('</div>');
                //if (this._numberOfColumns > 0) sb.append(errorHtml);
                sb.append(errorHtml);
                if (!isNullOrEmpty(field.FooterText))
                    sb.appendFormat('<div class="Footer">{0}</div>', field.FooterText);
                sb.append('</div>');
            }
        },
        _renderOnDemandItem: function (sb, field, row, isSelected, isForm) {
            var v = row[field.Index];
            var m = v != null ? v.toString().match(/^null\|(.+)$/) : null;
            var isNull = m != null || v == null;
            if (m) v = m[1];
            if (isNull && !isSelected && field.OnDemandStyle == 1)
                sb.append(isForm ? labelNullValueInForms : labelNullValue);
            else {
                var blobHref = this.resolveClientUrl(this.get_appRootPath() + resourcesData.BlobHandler);
                if (isSelected && !isNull) sb.appendFormat('<a href="{0}?{1}=o|{2}" title="{3}" onclick="$find(&quot;{4}&quot;)._showDownloadProgress();open(this.href, &quot;_blank&quot;,&quot;height={5},width={6},resizable=yes&quot;);return false">', blobHref, field.OnDemandHandler, v, resourcesData.BlobDownloadHint, this.get_id(), $window.height() / 2, $window.width() / 2);
                if (field.OnDemandStyle == 1) {
                    if (isNull)
                        sb.append(isForm ? labelNullValueInForms : labelNullValue);
                    else
                        sb.append(isSelected ? resourcesData.BlobDownloadLink : resourcesData.BlobDownloadLinkReadOnly);
                }
                else {
                    if (!isNull)
                        sb.appendFormat('<img src="{0}?{1}=t|{2}" class="Thumbnail"/>', blobHref, field.OnDemandHandler, v);
                    else
                        sb.append(isForm ? labelNullValueInForms : labelNullValue);
                }
                if (isSelected && !isNull) sb.append('</a>');
                if (!field.ReadOnly && (this.editing() && isSelected))
                    if (_app.upload())
                        sb.appendFormat('<div class="drop-box-{0}"></div>', field.Index);
                    else
                        sb.appendFormat('<iframe src="{0}?{1}=u|{2}&owner={3}&index={4}" frameborder="0" scrolling="no" id="{3}_Frame{4}" tabindex="{6}"></iframe><div style="display:none" id="{3}_ProgressBar{4}" class="UploadProgressBar">{5}</div>', blobHref, field.OnDemandHandler, v, this.get_id(), field.Index, 'Uploading...', $nextTabIndex());
            }
        },
        _renderGridView: function (sb) {
            this._renderViewDescription(sb);
            this._renderActionBar(sb);
            this._renderSearchBar(sb);
            var pagerLocation = this.get_showPager();
            var dataViewExtension = this.extension();
            this._renderPager(sb, 'Top');
            if (this.get_isChart()) {
                this._renderInfoBar(sb);
                this._sortingDisabled = false;
                var sorted = false;
                for (var i = 0; i < this._fields.length; i++) {
                    var f = this._fields[i];
                    if (f.Aggregate != 0)
                        this._sortingDisabled = true;
                    else if (!sorted) {
                        sorted = true;
                        this.set_sortExpression(null);
                        this.set_sortExpression(f.Name);
                    }
                }
                if (!dataViewExtension)
                    sb.appendFormat('<tr class="ChartRow"><td colspan="{1}" class="ChartCell"><img id="{0}$Chart" class="Chart" onload="if(this.readyState==\'complete\'){{this.style.height=\'\';_body_performResize()}}"/></td></tr>', this.get_id(), this._get_colSpan());
            }
            else {
                var hasKey = this._hasKey();
                var multipleSelection = this.multiSelect() && hasKey;
                if (!this.get_searchOnStart()) {
                    this._renderInfoBar(sb);
                    if (!dataViewExtension)
                        this._renderRows(sb, hasKey, multipleSelection);
                }
                if (!dataViewExtension) {
                    this._renderAggregates(sb, multipleSelection);
                    this._renderNoRecordsWhenNeeded(sb);
                }
            }
            if (!dataViewExtension)
                this._renderPager(sb, 'Bottom');
        },
        _renderAggregates: function (sb, multipleSelection) {
            var aggregates = this.get_aggregates();
            if (this._totalRowCount == 0 || aggregates == null) return;
            sb.append('<tr class="AggregateRow">');
            if (multipleSelection) sb.append('<td class="Aggregate">&nbsp;</td>');
            if (this.get_showIcons()) sb.append('<td class="Aggregate">&nbsp;</td>');
            if (this.get_isDataSheet()) sb.append('<td class="Aggregate">&nbsp;</td>');
            if (this._actionColumn) sb.append('<td class="Aggregate">&nbsp;</td>');
            for (var i = 0; i < this.get_fields().length; i++) {
                var field = this.get_fields()[i];
                if (field.Aggregate == 0) sb.append('<td class="None">&nbsp;</td>');
                else {
                    var v = aggregates[field.Index];
                    if (v == null) v = labelNullValue;
                    else v = field.format(v);
                    var f = this._allFields[field.AliasIndex];
                    if (f.IsMirror)
                        v = aggregates[field.AliasIndex];
                    var a = resourcesGrid.Aggregates[Web.DataViewAggregates[field.Aggregate]];
                    sb.appendFormat('<td class="Aggregate {0} {1}Type" title="', f.Name, f.Type);
                    sb.appendFormat(a.ToolTip, f.HeaderText);
                    sb.append('">');
                    sb.appendFormat(a.FmtStr, v);
                    sb.append('</td>');
                }
            }
            sb.append('</tr>');
        },
        _renderSearchBar: function (sb) {
            if (!this.get_showSearchBar()) return;
            if (__tf != 4) return;
            this._searchBarInitialized = false;
            sb.appendFormat('<tr class="SearchBarRow" id="{0}$SearchBar" style="{2}"><td colspan="{1}" class="SearchBarCell" id="{0}$SearchBarContent">Search bar goes here.<br/><br/><br/><br/></td></tr>', this.get_id(), this._get_colSpan(), this.get_searchBarIsVisible() ? '' : 'display:none');
        },
        _renderNoRecordsWhenNeeded: function (sb) {
            if (this._totalRowCount == 0) {
                var newRowLink = this.get_isDataSheet() && this._keyFields.length > 0 && this.executeActionInScope(['Row', 'ActionBar'], 'New', null, null, true) ? String.format(' <a href="javascript:" class="NewRowLink" onclick="$find(\'{0}\').newDataSheetRow();return false;" title="{2}">{1}</a>', this.get_id(), resourcesGrid.NewRowLink, resources.Lookup.GenericNewToolTip) : '';
                sb.appendFormat('<tr class="Row NoRecords"><td colspan="{0}" class="Cell">{1}{2}</td></tr>', this._get_colSpan(), resourcesData.NoRecords, newRowLink);
            }
        },
        _attachBehaviors: function () {
            this._detachBehaviors();
            this._attachFieldBehaviors();
            var e = this.get_quickFindElement();
            if (e) $addHandlers(e, this._quickFindHandlers, this);
        },
        _get: function (family, index) {
            return index == null ? $get(this.get_id() + family) : $get(this.get_id() + family + index);
        },
        _attachTimeOptions: function (field, element) {
            var c = $create(Web.AutoComplete, {
                'completionInterval': 500,
                'contextKey': '', //String.format('{0},{1},{2}', this.get_controller(), this.get_viewId(), field.Name),
                'delimiterCharacters': '',
                'id': this.get_id() + '_AutoComplete$Time' + field.Index,
                'minimumPrefixLength': field.AutoCompletePrefixLength,
                //'serviceMethod': 'GetCompletionList',
                //'servicePath': this.get_servicePath(),
                //'useContextKey': true,
                'typeCssClass': 'AutoComplete'
            },
                null, null, element);
            Sys.UI.DomElement.addCssClass(c._completionListElement, 'Time');
            var cache = null,
                cacheKey = field.DataFormatString && field.DataFormatString.replace(/\W/g, '_') || 'Default';
            if (field.Type == 'TimeSpan') {
                if (!_app._timeSpanOptions)
                    _app._timeSpanOptions = {};
                cache = _app._timeSpanOptions[cacheKey]
                if (!cache) {
                    cache = [];
                    var dt = new Date(),
                        formatString = field.DataFormatString || '{0:HH:mm}';
                    dt.setHours(0, 0, 0, 0);
                    while (cache.length < 24 * 4) {
                        Array.add(cache, String.localeFormat(formatString, dt)/*String.format('{0:d2}{1}{2:d2}', dt.getHours(), dateTimeFormat.TimeSeparator, dt.getMinutes())*/);
                        dt.setMinutes(dt.getMinutes() + 15);
                    }
                    _app._timeSpanOptions[cacheKey] = cache;
                }
            }
            else {
                cache = _app._timeOptions;
                if (!cache) {
                    cache = [];
                    dt = new Date();
                    dt.setHours(dt.getHours(), 0, 0, 0);
                    while (cache.length < 24 * 2) {
                        Array.add(cache, String.localeFormat('{0:' + dateTimeFormat.ShortTimePattern + '}', dt));
                        dt.setMinutes(dt.getMinutes() + 30);
                    }
                    _app._timeOptions = cache;
                }
            }
            (c._cache = [])['%'] = cache;
            return c;
        },
        _executeClientEditorFactories: function (field, element, attach) {
            var editors = element == null ? field.Editor : field.ClientEditor;
            if (!isNullOrEmpty(editors)) {
                var factories = editors.split(_app._simpleListRegex);
                for (var j = 0; j < factories.length; j++) {
                    var editorFactory = factories[j];
                    var factoryName = editorFactory.replace(/\W/g, '$');
                    var factoryInstance = _app.EditorFactories[factoryName];
                    if (factoryInstance == null) {
                        try {
                            factoryInstance = eval(String.format('typeof {0}!="undefined"?new {0}():""', factoryName));
                        }
                        catch (ex) {
                            factoryInstance = '';
                        }
                        _app.EditorFactories[factoryName] = factoryInstance;
                    }
                    if (element == null)
                        return factoryInstance != '';
                    if (factoryInstance != '') {
                        if (!attach && Array.indexOf(_app._customInputElements, element.id) < 0)
                            return;
                        var viewType = this.get_viewType();
                        var result = attach ? factoryInstance.attach(element, viewType) : factoryInstance.detach(element, viewType);
                        if (result) {
                            if (attach)
                                Array.add(_app._customInputElements, element.id);
                            else
                                Array.remove(_app._customInputElements, element.id);
                            return true;
                        }
                    }
                }
            }
            return false;
        },
        _attachFieldBehaviors: function () {
            var that = this;
            if (that.editing()) {
                for (var i = 0; i < this.get_fields().length; i++) {
                    var field = this.get_fields()[i];
                    var element = this._get('_Item', field.Index); // $get(this.get_id() + '_Item' + field.Index);
                    var c = null;
                    if (element && !field.ReadOnly && !this._executeClientEditorFactories(field, element, true)) {
                        if (element.tagName == 'TEXTAREA' && field.Len > 0) {
                            element.setAttribute('maxlength', field.Len);
                            $addHandler(element, 'keyup', this._checkMaxLengthHandler);
                            $addHandler(element, 'blur', this._checkMaxLengthHandler);
                        }
                        if (!isNullOrEmpty(field.Mask)) {
                            var cc = Sys.CultureInfo.CurrentCulture;
                            var sdp = cc.dateTimeFormat.ShortDatePattern.toUpperCase().split(cc.dateTimeFormat.DateSeparator);
                            var m = $create(AjaxControlToolkit.MaskedEditBehavior, {
                                'CultureAMPMPlaceholder': cc.dateTimeFormat.AMDesignator + ';' + cc.dateTimeFormat.PMDesignator,
                                'CultureCurrencySymbolPlaceholder': cc.numberFormat.CurrencySymbol,
                                'CultureDateFormat': sdp[0].substring(0, 1) + sdp[1].substring(0, 1) + sdp[2].substring(0, 1),
                                'CultureDatePlaceholder': cc.dateTimeFormat.DateSeparator,
                                'CultureDecimalPlaceholder': cc.numberFormat.NumberDecimalSeparator,
                                'CultureName': cc.name,
                                'CultureThousandsPlaceholder': cc.numberFormat.NumberGroupSeparator,
                                'CultureTimePlaceholder': cc.dateTimeFormat.TimeSeparator,
                                'DisplayMoney': field.DataFormatString == '{0:c}',
                                'Mask': field.Mask,
                                'MaskType': field.MaskType,
                                'ClearMaskOnLostFocus': field.MaskType > 0,
                                'id': this.get_id() + '_MaskedEdit' + field.Index
                            },
                                null, null, element);
                            if (field.MaskType == 2) m.set_InputDirection(1);
                            Array.add(field.Behaviors, m);

                        }
                        if (field.Type.startsWith('Date')) {
                            c = $create(AjaxControlToolkit.CalendarBehavior, { id: this._get('_Calendar', field.Index)/* this.get_id() + '_Calendar' + field.Index*/ }, null, null, element);
                            c.set_format((field.DateFmtStr ? field.DateFmtStr : field.DataFormatString).match(/\{0:([\s\S]*?)\}/)[1]);
                            var button = $get(element.id + '_Button');
                            if (button) c.set_button(button);
                            if (field.TimeFmtStr) {
                                element = this._get('_Item$Time', field.Index);
                                if (element) {
                                    Array.add(field.Behaviors, c);
                                    c = this._attachTimeOptions(field, element);
                                }
                                //                            if (element) {
                                //                                Array.add(field.Behaviors, c);
                                //                                c = $create(Web.AutoComplete, {
                                //                                    'completionInterval': 500,
                                //                                    'contextKey': '', //String.format('{0},{1},{2}', this.get_controller(), this.get_viewId(), field.Name),
                                //                                    'delimiterCharacters': '',
                                //                                    'id': this.get_id() + '_AutoComplete$Time' + field.Index,
                                //                                    'minimumPrefixLength': field.AutoCompletePrefixLength,
                                //                                    //'serviceMethod': 'GetCompletionList',
                                //                                    //'servicePath': this.get_servicePath(),
                                //                                    //'useContextKey': true,
                                //                                    'typeCssClass': 'AutoComplete'
                                //                                },
                                //                                    null, null, element);
                                //                                Sys.UI.DomElement.addCssClass(c._completionListElement, 'Time');
                                //                                var cache = _app._timeOptions;
                                //                                if (!cache) {
                                //                                    cache = [];
                                //                                    var dt = new Date();
                                //                                    dt.setHours(dt.getHours(), 0, 0, 0);
                                //                                    while (cache.length < 24 * 2) {
                                //                                        Array.add(cache, String.localeFormat('{0:' + Sys.CultureInfo.CurrentCulture.dateTimeFormat.ShortTimePattern + '}', dt));
                                //                                        dt.setMinutes(dt.getMinutes() + 30);
                                //                                    }
                                //                                    _app._timeOptions = cache;
                                //                                }
                                //                                (c._cache = [])['%'] = cache;
                                //                            }
                            }
                        }
                        else if (field.Type == 'TimeSpan')
                            c = this._attachTimeOptions(field, element);
                        else if (element.type == 'text' && field.AutoCompletePrefixLength > 0) {
                            c = $create(Web.AutoComplete, {
                                'completionInterval': 500,
                                'contextKey': String.format('{0},{1},{2}', this.get_controller(), this.get_viewId(), field.Name),
                                'delimiterCharacters': ',;',
                                'id': this.get_id() + '_AutoComplete' + field.Index,
                                'minimumPrefixLength': field.AutoCompletePrefixLength,
                                'serviceMethod': 'GetCompletionList',
                                'servicePath': this.get_servicePath(),
                                'useContextKey': true,
                                'typeCssClass': 'AutoComplete'
                            },
                                null, null, element);
                        }
                        else if (field.ItemsStyle == 'AutoComplete') {
                            var aliasField = this._allFields[field.AliasIndex];
                            element = this._get('_Item', aliasField.Index);
                            if (element && element.type == 'text')
                                c = $create(Web.AutoComplete, {
                                    'completionInterval': 500,
                                    'contextKey': String.format('Field:{0},{1}', this.get_id(), aliasField.Name),
                                    'delimiterCharacters': '',
                                    'id': this.get_id() + '_AutoComplete' + field.Index,
                                    'minimumPrefixLength': field.AutoCompletePrefixLength == 0 ? 1 : field.AutoCompletePrefixLength,
                                    'serviceMethod': 'GetPage',
                                    'servicePath': this.get_servicePath(),
                                    'useContextKey': true,
                                    'fieldName': field.Name,
                                    'enableCaching': false,
                                    'typeCssClass': 'Lookup'
                                },
                                    null, null, element);
                        }
                        if (c)
                            Array.add(field.Behaviors, c);
                    }
                    else if (field.OnDemand) {
                        var dropBox = $(this._container).find('.drop-box-' + field.Index);
                        if (dropBox.length)
                            if (field._dropBox) {
                                field._dropBoxInput.insertAfter(dropBox);
                                field._dropBox.insertAfter(dropBox);
                                dropBox.remove();
                                field._dropBoxInput = null
                                field._dropBox = null;
                            }
                            else
                                _app.upload('create', {
                                    container: dropBox,
                                    dataViewId: that._id,
                                    fieldName: field.Name
                                });
                    }
                }
            }
        },
        _detachBehaviors: function () {
            // detach quick find
            if (_touch) return;
            var e = this.get_quickFindElement();
            if (e) $clearHandlers(e);
            // detach row header drop downs and field behaviors
            //var editing = this.editing();
            if (this.get_fields() != null) {
                for (i = 0; i < this.get_fields().length; i++) {
                    var field = this.get_fields()[i];
                    var element = this._get('_Item', field.Index);
                    if (element && this._executeClientEditorFactories(field, element, false))
                        continue;
                    if (field.Len > 0 && field.Rows > 1) {
                        if (element && element.tagName == 'TEXTAREA' && element._events) {
                            $removeHandler(element, 'keyup', this._checkMaxLengthHandler);
                            $removeHandler(element, 'blur', this._checkMaxLengthHandler);
                        }
                    }
                    if (field._lookupModalBehavior != null) {
                        field._lookupModalBehavior.dispose();
                        field._lookupModalPanel.parentNode.removeChild(field._lookupModalPanel);
                        delete field._lookupModalPanel;
                        field._lookupModalBehavior = null;
                    }
                    if (field._lookupDataControllerBehavior != null) {
                        field._lookupDataControllerBehavior.dispose();
                        field._lookupDataControllerBehavior = null;
                    }
                    for (var j = 0; j < field.Behaviors.length; j++)
                        field.Behaviors[j].dispose();
                    Array.clear(field.Behaviors);
                    if (field.Editor)
                        _app.Editors[field.EditorId] = null;
                    if (field.OnDemand) {
                        var dropBox = $(this._container).find('.drop-box-' + field.Index);
                        if (dropBox.length && dropBox.is('.app-drop-box') && !dropBox.is('.app-drop-box-destroyed')) {
                            field._dropBoxInput = dropBox.next().detach();
                            field._dropBox = dropBox.detach();
                        }
                    }
                }
            }
        },
        _registerDataTypeFilterItems: function (family, parentItem, filterDef, activeFunc, field) {
            var item = null;
            for (var i = 0; i < filterDef.length; i++) {
                var fd = filterDef[i];
                if (!fd) {
                    if (!field.SearchOptions) {
                        item = new Web.Item(family);
                        parentItem.addChild(item);
                    }
                }
                else if (!fd.Hidden && (!field.SearchOptions || Array.indexOf(field.SearchOptions, fd.Function) >= 0)) {
                    item = new Web.Item(family, fd.Prompt ? fd.Text + '...' : fd.Text);
                    parentItem.addChild(item);
                    if (fd.List)
                        this._registerDataTypeFilterItems(family, item, fd.List, activeFunc, field);
                    else
                        if (fd.Prompt)
                            item.set_script('$find("{0}").showFieldFilter({1},"{2}","{3}")', this.get_id(), field.Index, fd.Function, fd.Text);
                        else
                            item.set_script('$find("{0}").applyFieldFilter({1},"{2}")', this.get_id(), field.Index, fd.Function);
                    if (activeFunc && fd.Function == activeFunc) {
                        var currItem = item;
                        while (currItem) {
                            currItem.set_selected(true);
                            currItem = currItem.get_parent();
                        }
                    }
                }
            }
        },
        _registerFieldHeaderItems: function (fieldIndex, containerFamily, containerItems, ignoreAggregates) {
            var startIndex = fieldIndex == null ? 0 : fieldIndex;
            var endIndex = fieldIndex == null ? this.get_fields().length - 1 : fieldIndex;
            var sort = this.get_sortExpression();
            if (sort) sort = sort.match(/^(\w+)\s+(asc|desc)/);
            for (var i = startIndex; i <= endIndex; i++) {
                var fieldFilter = null;
                var items = new Array();
                var family = containerFamily ? containerFamily : String.format('{0}$FieldHeaderSelector${1}', this.get_id(), i);
                var originalField = this.get_fields()[i];
                var field = this._allFields[originalField.AliasIndex];
                if (ignoreAggregates && field.Aggregate != 0) continue;
                if (field.AllowSorting || field.AllowQBE) {
                    var ascending = resourcesHeaderFilter.GenericSortAscending;
                    var descending = resourcesHeaderFilter.GenericSortDescending;
                    switch (field.FilterType) {
                        case 'Text':
                            ascending = resourcesHeaderFilter.StringSortAscending;
                            descending = resourcesHeaderFilter.StringSortDescending;
                            break;
                        case 'Date':
                            ascending = resourcesHeaderFilter.DateSortAscending;
                            descending = resourcesHeaderFilter.DateSortDescending;
                            break;
                    }
                    var allowSorting = field.AllowSorting && !this._sortingDisabled;
                    if (allowSorting) {
                        var sortedBy = sort && sort[1] == field.Name;
                        var item = new Web.Item(family, ascending);
                        if (sortedBy && sort[2] == 'asc')
                            item.set_selected(true);
                        else
                            item.set_cssClass('SortAscending');
                        item.set_script('$find("{0}").sort("{1} asc")', this.get_id(), field.Name);
                        Array.add(items, item);
                        item = new Web.Item(family, descending);
                        if (sortedBy && sort[2] == 'desc')
                            item.set_selected(true);
                        else
                            item.set_cssClass('SortDescending');
                        item.set_script('$find("{0}").sort("{1} desc")', this.get_id(), field.Name);
                        Array.add(items, item);
                    }
                    if (field.AllowQBE) {
                        fieldFilter = this.filterOf(field);
                        if (allowSorting) Array.add(items, new Web.Item())
                        item = new Web.Item(family, String.format(resourcesHeaderFilter.ClearFilter, field.HeaderText));
                        item.set_cssClass('FilterOff');
                        if (!fieldFilter) item.set_disabled(true);
                        item.set_script('$find("{0}").applyFilterByIndex({1},-1)', this.get_id(), originalField.AliasIndex);
                        Array.add(items, item);
                        var activeFunc = null;
                        if (!__designer()) {
                            var filterDef = resourcesDataFilters[field.FilterType];
                            if (field.Items.length == 0) {
                                item = new Web.Item(family, filterDef.Text);
                                Array.add(items, item);
                                activeFunc = this.get_fieldFilter(field, true);
                                this._registerDataTypeFilterItems(family, item, filterDef.List, activeFunc, field);
                            }
                            if (field.FilterType != 'Boolean' && (!field.SearchOptions || Array.indexOf(field.SearchOptions, '$in') >= 0) && field.AllowMultipleValues != false) {
                                item = new Web.Item(family, resourcesHeaderFilter.CustomFilterOption);
                                if (fieldFilter && fieldFilter.match(/\$(in|out)\$/))
                                    item.set_selected(true);
                                else
                                    item.set_cssClass('CustomFilter');
                                item.set_script('$find("{0}").showCustomFilter({1})', this.get_id(), originalField.AliasIndex);
                                Array.add(items, item);
                            }
                        }
                        if (originalField.AllowSamples != false)
                            if (originalField._listOfValues) {
                                if (fieldFilter && fieldFilter.startsWith('=')) {
                                    fieldFilter = fieldFilter.substring(1);
                                    if (fieldFilter.endsWith('\0'))
                                        fieldFilter = fieldFilter.substring(0, fieldFilter.length - 1);
                                }
                                for (var j = 0; j < originalField._listOfValues.length; j++) {
                                    if (j == 0) Array.add(items, new Web.Item());
                                    var v = originalField._listOfValues[j];
                                    var isSelected = false;
                                    var text = v;
                                    if (v == null)
                                        text = resourcesHeaderFilter.EmptyValue;
                                    else if (field.Items.length > 0) {
                                        item = this._findItemByValue(field, v);
                                        text = item[1];
                                    }
                                    else {
                                        if (field.Type == 'String' && v.length == 0)
                                            text = resourcesHeaderFilter.BlankValue;
                                        else if (!isNullOrEmpty(field.DataFormatString))
                                            text = field.Type.startsWith('DateTime') ? String.localeFormat('{0:d}', v) : field.format(v);
                                    }
                                    v = this.convertFieldValueToString(field, v); // == null ? 'null' : this.convertFieldValueToString(field, v);
                                    isSelected = activeFunc == '=' && fieldFilter && v == fieldFilter;
                                    if (text.length > resourcesHeaderFilter.MaxSampleTextLen) text = text.substring(0, resourcesHeaderFilter.MaxSampleTextLen) + '...';
                                    if (typeof text != 'string') text = text.toString();
                                    item = new Web.Item(family, text);
                                    if (isSelected) item.set_selected(true);
                                    item.set_script("$find(\'{0}\').applyFilterByIndex({1},{2});", this.get_id(), originalField.AliasIndex, j);
                                    item.set_group(1);
                                    Array.add(items, item);
                                }
                            }
                            else if (!field.SearchOptions || Array.indexOf(field.SearchOptions, '=') >= 0) {
                                item = new Web.Item(family, resourcesHeaderFilter.Loading);
                                item.set_dynamic(true);
                                item.set_script('$find("{0}")._loadListOfValues("{1}","{2}","{3}")', this.get_id(), family, originalField.Name, field.Name);
                                Array.add(items, item);
                            }
                    }
                }
                if (containerFamily) {
                    item = new Web.Item(containerFamily, field.HeaderText);
                    Array.add(containerItems, item);
                    for (j = 0; j < items.length; j++) {
                        var child = items[j];
                        item.addChild(child);
                    }
                    if (child.get_selected())
                        item.set_selected(true);
                    if (fieldFilter)
                        item.set_selected(true);
                }
                else
                    $registerItems(family, items, Web.HoverStyle.Click, Web.PopupPosition.Right, Web.ItemDescriptionStyle.ToolTip);
            }
        },
        _get_specialAction: function (type) {
            if (!this._specialActions) return null;
            var text = this._specialActions[type + 'Text'];
            var script = this._specialActions[type + 'Script'];
            return isNullOrEmpty(script) ? null : { 'text': text, 'script': script };
        },
        _registerSpecialAction: function (a, groupIndex, actionIndex, available) {
            var that = this,
                id = that.get_id(),
                commandName = a.CommandName,
                headerText = a.HeaderText,
                specialActions = that._specialActions;
            if (!specialActions.PrintText && commandName && commandName.match(/^Report/)) {
                if (available !== true && !that._isActionAvailable(a))
                    return;
                specialActions.PrintText = headerText;
                specialActions.PrintScript = String.format('$find(\'{0}\').executeAction(\'ActionBar\',{1},-1,{2})', id, actionIndex, groupIndex);
            }
            else if (a.CssClass === 'AttachIcon') {
                if (available !== true && !that._isActionAvailable(a))
                    return;
                specialActions.AnnotateText = headerText;
                specialActions.AnnotateScript = String.format('$find(\'{0}\').executeAction(\'ActionBar\',{1},0,{2})', id, actionIndex, groupIndex);
            }
        },
        _registerActionBarItems: function () {
            var groups = this.get_actionGroups('ActionBar');
            var isChart = this.get_isChart();
            if (isChart && !this.get_showViewSelector()) {
                var family = String.format('{0}${1}$ActionGroup$Chart', this.get_id(), this.get_viewId());
                var items = [];
                this._registerFieldHeaderItems(null, family, items, true);
                $registerItems(family, items, Web.HoverStyle.ClickAndStay, Web.PopupPosition.Left, Web.ItemDescriptionStyle.None);
            }
            this._specialActions = { 'PrintText': null, 'PrintScript': null, 'AnnotateText': null, 'AnnotateScript': null };
            for (var i = 0; i < groups.length; i++) {
                var group = groups[i];
                family = String.format('{0}${1}$ActionGroup${2}', this.get_id(), this.get_viewId(), i);
                if (!group.Flat) {
                    items = new Array();
                    for (var j = 0; j < group.Actions.length; j++) {
                        var a = group.Actions[j];
                        if (this._isActionAvailable(a)) {
                            var item = new Web.Item(family, a.HeaderText, a.Description);
                            item.set_cssClass(a.CssClassEx + (isNullOrEmpty(a.CssClass) ? a.CommandName + 'LargeIcon' : a.CssClass));
                            Array.add(items, item);
                            item.set_script(String.format('$find(\'{0}\').executeAction(\'ActionBar\',{1},null,{2})', this.get_id(), j, i));
                            this._registerSpecialAction(a, i, j, true);
                        }
                    }
                    $registerItems(family, items, Web.HoverStyle.ClickAndStay, Web.PopupPosition.Left, Web.ItemDescriptionStyle.Inline);
                }
                else {
                    $unregisterItems(family);
                    for (j = 0; j < group.Actions.length; j++)
                        this._registerSpecialAction(group.Actions[j], i, j);
                }
            }
            Array.clear(groups);
        },
        _registerViewSelectorItems: function () {
            var items = new Array(),
                that = this,
                family = that.get_id() + '$ViewSelector';
            for (var i = 0; i < that.get_views().length; i++) {
                var view = that.get_views()[i];
                if (view.Type != 'Form' && view.ShowInSelector || view.Id == that.get_viewId()) {
                    var item = new Web.Item(family, view.Label);
                    if (view.Id == this.get_viewId())
                        item.set_selected(true);
                    //item.set_script('$find("{0}").executeCommand({{commandName:"Select",commandArgument:"{1}"}})', this.get_id(), view.Id);
                    item.set_script(function (context) {
                        that.executeCommand({ commandName: 'Select', commandArgument: context.Id });
                    });
                    item.context(view);
                    Array.add(items, item);
                }
            }
            if (that.get_isChart()) {
                Array.add(items, new Web.Item());
                that._registerFieldHeaderItems(null, family, items, true);
            }
            $registerItems(family, items, Web.HoverStyle.ClickAndStay, Web.PopupPosition.Right, Web.ItemDescriptionStyle.None);
        },
        _registerRowSelectorItems: function () {
            var actions = this.get_actions('Grid');
            if (actions && actions.length > 0) {
                for (var i = 0; i < this._rows.length; i++) {
                    var items = new Array();
                    var family = String.format('{0}$RowSelector${1}', this.get_id(), i);
                    for (var j = 0; j < actions.length; j++) {
                        var a = actions[j];
                        if (this._isActionAvailable(a, i)) {
                            var item = new Web.Item(family, a.HeaderText, a.Description);
                            item.set_cssClass(a.CssClassEx + (isNullOrEmpty(a.CssClass) ? a.CommandName + 'Icon' : a.CssClass) + (items.length == 0 ? ' Default' : ''));
                            Array.add(items, item);
                            item.set_script(String.format('$find("{0}").executeAction("Grid", {1},{2})', this.get_id(), j, i));
                        }
                    }
                    $registerItems(family, items, Web.HoverStyle.Click, Web.PopupPosition.Right, Web.ItemDescriptionStyle.ToolTip);
                }
            }
            else
                for (i = 0; i < this._rows.length; i++)
                    $unregisterItems(String.format('{0}$RowSelector${1}', this.get_id(), i));
        },
        _get_searchBarSettings: function () {
            if (!this._searchBarSettings) this._searchBarSettings = [];
            var settings = this._searchBarSettings[this.get_viewId()];
            if (!settings) {
                var availableFields = [];
                var visibleFields = [];
                var currentFilter = this.get_filter();
                if (currentFilter.length > 0 && !this.filterIsExternal()) {
                    for (var i = 0; i < currentFilter.length; i++) {
                        var filter = currentFilter[i].match(_app._fieldFilterRegex);
                        var field = this.findField(filter[1]);
                        if (!field || this._fieldIsInExternalFilter(field)) continue;
                        var aliasField = this._allFields[field.AliasIndex];
                        var m = filter[2].match(_app._filterRegex);
                        if (!filter[2].startsWith('~')) {
                            field._renderedOnSearchBar = true;
                            var item = this._findItemByValue(field, m[3]);
                            var v = m[3]; // item == null ? m[3] : item[1];
                            if (v == 'null') v = '';
                            var vm = v.match(/^([\s\S]+?)\0?$/);
                            if (vm) v = vm[1];
                            var func = field.Items.length == 0 ? m[1] : '$in';
                            var fd = _app.filterDef(resourcesDataFilters[field.FilterType].List, field.FilterType == 'Boolean' && m[3].length > 1 ? (m[3] == '%js%true' ? '$true' : '$false') : func);
                            if (fd) {
                                var m2 = v.match(/^(.+?)\$and\$(.+?)$/);
                                Array.add(visibleFields, { 'Index': field.Index, 'Function': String.format('{0},{1}', fd.Function, fd.Prompt ? 'true' : 'false'), 'Value': m2 ? m2[1] : v, 'Value2': m2 ? m2[2] : '' });
                            }
                        }
                    }
                }
                var customSearch = false;
                for (i = 0; i < this._allFields.length; i++) {
                    field = this._allFields[i];
                    customSearch = field.Search == Web.FieldSearchMode.Required || field.Search == Web.FieldSearchMode.Suggested;
                    if (customSearch) break;
                }
                for (i = 0; i < this._allFields.length; i++) {
                    var originalField = this._allFields[i];
                    field = this._allFields[originalField.AliasIndex];
                    if (field.AllowQBE && field.Search != Web.FieldSearchMode.Forbidden && (!originalField.Hidden || originalField.Search != Web.FieldSearchMode.Default)) {
                        var visible = !customSearch && visibleFields.length < resourcesGrid.VisibleSearchBarFields || (customSearch && (originalField.Search == Web.FieldSearchMode.Required || originalField.Search == Web.FieldSearchMode.Suggested));
                        if (!field._renderedOnSearchBar) {
                            var defaultFunction = field.Items.length == 0 || field.FilterType == 'Boolean' ? null : '$in';
                            if (field.SearchOptions)
                                defaultFunction = field.SearchOptions[0];
                            var dataFiltersList = resourcesDataFilters[field.FilterType].List;
                            for (var k = 0; k < dataFiltersList.length; k++) {
                                fd = dataFiltersList[k];
                                if (fd != null && (defaultFunction == null || fd.Function == defaultFunction))
                                    break;
                            }
                            var f = { 'Index': field.Index, 'Function': String.format('{0},{1}', fd.Function, fd.Prompt ? 'true' : 'false') };
                            if (visible || (this.findFieldUnderAlias(field) == field || field.VisibleOnSearchBar == null))
                                Array.add(visible ? visibleFields : availableFields, f);
                            field.VisibleOnSearchBar = visible;
                        }
                        field._renderedOnSearchBar = false;
                    }
                }
                settings = { 'visibleFields': visibleFields, 'availableFields': availableFields };
                this._searchBarSettings[this.get_viewId()] = settings;
            }
            return settings;
        },
        _toggleSearchBar: function () {
            if (this._hasSearchShortcut && this.search())
                return;
            this.set_searchBarIsVisible(!this.get_searchBarIsVisible());
            this._updateSearchBar();
            if (this.get_searchBarIsVisible()) {
                if (this.get_lookupField())
                    this._adjustLookupSize();
                this._focusSearchBar();
            }
            _body_performResize();
        },
        _renderSearchBarFieldNameOptions: function (sb, field, settings) {
            if (field.Search == Web.FieldSearchMode.Required) return;
            for (var i = 0; i < settings.availableFields.length; i++) {
                var fieldInfo = settings.availableFields[i];
                var f = this._allFields[fieldInfo.Index];
                sb.appendFormat('<option value="{0}">{1}</option>', i, _app.htmlEncode(f.HeaderText));
            }
            //if (settings.visibleFields.length > 1)
            //    sb.appendFormat('<option value="{0}" class="Delete">{0}</option>', Web.DataViewResources.Grid.DeleteSearchBarField);
        },
        _renderSearchBarFunctionOptions: function (sb, field, filterDefs, fieldInfo, allowedFunction) {
            for (var i = 0; i < filterDefs.length; i++) {
                var fd = filterDefs[i];
                if (fd) {
                    if (fd.List)
                        this._renderSearchBarFunctionOptions(sb, field, fd.List, fieldInfo);
                    else if (allowedFunction == null || fd.Function == allowedFunction) {
                        var v = String.format('{0},{1}', _app.htmlAttributeEncode(fd.Function), fd.Prompt ? 'true' : 'false')
                        var selected = v == fieldInfo.Function ? ' selected="selected"' : '';
                        var option = String.format('<option value="{0}"{1}>{2}{3}</option>', v, selected, (fd.Prompt ? '' : resourcesDataFiltersLabels.Equals + ' '), !fd.Function.match(_app._keepCapitalization) ? fd.Text.toLowerCase() : fd.Text);
                        if (field.SearchOptions) {
                            var functionIndex = Array.indexOf(field.SearchOptions, fd.Function);
                            if (functionIndex >= 0)
                                field.SearchOptionSet[functionIndex] = option;
                        }
                        else
                            sb.append(option);
                    }
                }
            }
        },
        _renderSearchBarField: function (sb, settings, visibleIndex) {
            var fieldInfo = settings.visibleFields[visibleIndex];
            var field = this._allFields[fieldInfo.Index];
            var allowedFunction = field.Items.length == 0 || field.FilterType == 'Boolean' ? null : '$in';
            var funcInfo = fieldInfo.Function.match(/^(.+?),(true|false)$/);
            sb.appendFormat('<tr id="{0}$SearchBarField${1}"><td class="Control"><select id="{0}$SearchBarName${1}" tabindex="{3}" onchange="$find(\'{0}\')._searchBarNameChanged({1})"><option value="{1}" selected="selected">{2}</option>', this.get_id(), visibleIndex, _app.htmlEncode(field.HeaderText), $nextTabIndex());
            this._renderSearchBarFieldNameOptions(sb, field, settings);
            sb.append('</select></td>');
            sb.appendFormat('<td class="Control"><select id="{0}$SearchBarFunction${1}" class="Function" tabindex="{2}" onchange="$find(\'{0}\')._searchBarFuncChanged({1})">', this.get_id(), visibleIndex, $nextTabIndex());
            if (field.SearchOptions)
                field.SearchOptionSet = [];
            this._renderSearchBarFunctionOptions(sb, field, resourcesDataFilters[field.FilterType].List, fieldInfo, allowedFunction);
            if (field.SearchOptions)
                for (var i = 0; i < field.SearchOptionSet.length; i++)
                    sb.append(field.SearchOptionSet[i]);
            sb.append('</select></td>');
            var button = field.Type.startsWith('DateTime') ? '<a class="Calendar" href="javascript:" onclick="return false">&nbsp;</a>' : '';
            var isFilter = funcInfo[1] == '$in' || funcInfo[1] == '$notin';
            var fieldValue = fieldInfo.Value;
            if (isFilter) {
                var fsb = new Sys.StringBuilder();
                var hasValues = !isNullOrEmpty(fieldValue)
                fsb.appendFormat('<table class="FilterValues{3}" cellpadding="0" cellspacing="0" onmouseover="$app.highlightFilterValues(this,true,\'Active\')" onmouseout="$app.highlightFilterValues(this,false,\'Active\')"><tr><td class="Values" valign="top"><div><a class="Link" onclick="$find(\'{0}\')._showSearchBarFilter({1},{2});return false;" tabindex="{4}" href="javascript:" onfocus="$app.highlightFilterValues(this,true,\'Focused\')" onblur="$app.highlightFilterValues(this,false,\'Focused\')" title="{5}">', this.get_id(), field.Index, visibleIndex, hasValues ? '' : ' Empty', $nextTabIndex(), resourcesDataFiltersLabels.FilterToolTip);
                if (hasValues) {
                    var values = fieldValue.split(/\$or\$/);
                    for (i = 0; i < values.length; i++) {
                        if (i > 0)
                            fsb.append('<span class="Highlight">, </span>');
                        var v = values[i];
                        if (String.isJavaScriptNull(v))
                            v = resourcesHeaderFilter.EmptyValue;
                        else {
                            v = this.convertStringToFieldValue(field, v);
                            var item = this._findItemByValue(field, v);
                            v = item ? item[1] : field.format(v);
                        }
                        fsb.append(v);
                    }
                }
                else
                    fsb.append(resources.Lookup.SelectLink);
                fsb.appendFormat('</a></div></td><td class="Button{5}" valign="top"><a href="javascript:" onclick="$find(\'{0}\')._showSearchBarFilter({1},{2});return false" title="{3}" tabindex="{4}" onfocus="$app.highlightFilterValues(this,true,\'Focused\')" onblur="$app.highlightFilterValues(this,false,\'Focused\')" >&nbsp;</a></td></tr></table>', this.get_id(), hasValues ? -1 : field.Index, visibleIndex, hasValues ? labelClear : resourcesDataFiltersLabels.FilterToolTip, $nextTabIndex(), hasValues ? ' Clear' : '');
                button = fsb.toString();
            }
            else if (!isNullOrEmpty(fieldValue))
                fieldValue = fieldValue.split(/\$or\$/)[0];
            if (funcInfo[2] == 'true') {
                if (typeof fieldValue == 'string' && !isFilter)
                    fieldValue = field.format(this.convertStringToFieldValue(field, fieldValue));
                sb.appendFormat('<td class="Control"><input id="{0}$SearchBarValue${1}" type="{6}" class="{2} {7}" value="{3}" tabindex="{4}"/>{5}</td>', this.get_id(), visibleIndex, field.FilterType, _app.htmlAttributeEncode(fieldValue == 'null' ? resourcesHeaderFilter.EmptyValue : fieldValue), $nextTabIndex(), button, isFilter ? 'hidden' : 'text', field.AllowAutoComplete != false ? ' AutoComplete' : '');
            }
            else
                sb.append('<td>&nbsp;</td>');
            var tabIndex = $nextTabIndex();
            if (funcInfo[1] == '$between')
                tabIndex = $nextTabIndex();
            sb.appendFormat('<td class="FieldAction"><a href="javascript:" tabindex="{1}" title="{2}" class="Remove" onclick="$find(\'{0}\')._searchBarNameChanged({3}, true)"><span></span</a></td>',
                this.get_id(), tabIndex, resourcesGrid.RemoveCondition, visibleIndex);
            sb.append('</tr>');
            if (field.FilterType != 'Text' && funcInfo[1] == '$between') {
                var fieldValue2 = fieldInfo.Value2;
                if (typeof fieldValue2 == 'string')
                    fieldValue2 = field.format(this.convertStringToFieldValue(field, fieldValue2));
                sb.appendFormat('<tr><td colspan="2" class="Control AndLabel">{4}</td><td><input id="{0}$SearchBarValue2${1}" type="text" class="{2}" value="{3}" tabindex="{5}"/>{6}</td><td>&nbsp;</td></tr>', this.get_id(), visibleIndex, field.FilterType, _app.htmlAttributeEncode(fieldValue2), resourcesDataFiltersLabels.And, tabIndex - 1, button);
            }
        },
        _focusSearchBar: function (visibleIndex) {
            var indexSpecified = visibleIndex != null;
            if (!indexSpecified) visibleIndex = 0;
            var funcElem = this._get_searchBarControl('Function', visibleIndex);
            if (!funcElem) {
                visibleIndex = 0;
                funcElem = this._get_searchBarControl('Function', 0);
            }
            var valElem = this._get_searchBarControl('Value', visibleIndex);
            if (valElem) {
                if (valElem.type == 'hidden') {
                    var a = valElem.parentNode.getElementsByTagName('a')[0];
                    a.focus();
                    if (indexSpecified && this._searchBarVisibleIndex == null && isNullOrEmpty(valElem.value))
                        a.click();
                }
                else {
                    Sys.UI.DomElement.setFocus(valElem);
                    //valElem.focus();
                    //valElem.select();
                }
            }
            else if (funcElem)
                funcElem.focus();
        },
        _searchBarNameChanged: function (visibleIndex, remove) {
            this._saveSearchBarSettings();
            var settings = this._get_searchBarSettings();
            var fieldInfo = settings.visibleFields[visibleIndex];

            if (!remove) {
                var nameElem = this._get_searchBarControl('Name', visibleIndex);
                var availableIndex = parseInteger(nameElem.value);
                settings.visibleFields[visibleIndex] = settings.availableFields[availableIndex];
                Array.removeAt(settings.availableFields, availableIndex);
            }
            else
                Array.removeAt(settings.visibleFields, visibleIndex);

            Array.insert(settings.availableFields, 0, fieldInfo);
            this._renderSearchBarControls(true);
            this._focusSearchBar(visibleIndex);
        },
        _searchBarFuncChanged: function (visibleIndex) {
            this._saveSearchBarSettings();
            var settings = this._get_searchBarSettings();
            var fieldInfo = settings.visibleFields[visibleIndex];
            var funcElem = this._get_searchBarControl('Function', visibleIndex);
            fieldInfo.Function = funcElem.value;
            this._renderSearchBarControls(true);
            this._focusSearchBar(visibleIndex);
        },
        _searchBarAddField: function () {
            this._saveSearchBarSettings();
            var settings = this._get_searchBarSettings();
            Array.add(settings.visibleFields, settings.availableFields[0]);
            Array.removeAt(settings.availableFields, 0);
            this._renderSearchBarControls(true);
            this._focusSearchBar(settings.visibleFields.length - 1);
        },
        _createSearchBarFilter: function (silent) {
            var oldFilter = Array.clone(this._filter);
            var settings = this._get_searchBarSettings();
            var filter = [];
            var success = true;
            for (var i = 0; i < settings.visibleFields.length; i++) {
                var fieldInfo = settings.visibleFields[i];
                var field = this._allFields[fieldInfo.Index];
                this.removeFromFilter(field);
                var funcInfo = fieldInfo.Function.match(/^(.+?),(true|false)$/);
                var values = [];
                if (funcInfo[2] == 'true') {
                    var valElem = this._get_searchBarControl('Value', i);
                    var val2Elem = this._get_searchBarControl('Value2', i);
                    if (isBlank(valElem.value) && (!val2Elem || isBlank(val2Elem.value)) && field.Search != Web.FieldSearchMode.Required)
                        continue;
                    if (funcInfo[1] == '$in' || funcInfo[1] == '$notin') {
                        Array.add(filter, { 'Index': field.Index, 'Function': funcInfo[1], 'Values': [valElem.value] });
                        continue;
                    }
                    if (isBlank(valElem.value)) {
                        if (silent)
                            continue;
                        else {
                            alert(resourcesValidator.RequiredField);
                            Sys.UI.DomElement.setFocus(valElem);
                            //valElem.focus();
                            //valElem.select();
                            success = false;
                        }
                        break;
                    }
                    var v = { NewValue: valElem.value.trim() };
                    var error = this._validateFieldValueFormat(field, v);
                    if (error) {
                        if (silent)
                            continue;
                        else {
                            alert(error);
                            Sys.UI.DomElement.setFocus(valElem);
                            //valElem.focus();
                            //valElem.select();
                            success = false;
                            break;
                        }
                    }
                    else
                        Array.add(values, field.Type.startsWith('DateTime') ? valElem.value.trim() : v.NewValue);
                    if (funcInfo[1] == '$between') {
                        if (isBlank(val2Elem.value)) {
                            if (silent)
                                continue;
                            else {
                                alert(resourcesValidator.RequiredField);
                                Sys.UI.DomElement.setFocus(val2Elem);
                                //val2Elem.focus();
                                //val2Elem.select();
                                success = false;
                            }
                            break;
                        }
                        v = { NewValue: val2Elem.value.trim() };
                        error = this._validateFieldValueFormat(field, v);
                        if (error) {
                            if (silent)
                                continue;
                            else {
                                alert(error);
                                Sys.UI.DomElement.setFocus(val2Elem);
                                //val2Elem.focus();
                                //val2Elem.select();
                                success = false;
                                break;
                            }
                        }
                        else
                            Array.add(values, field.Type.startsWith('DateTime') ? val2Elem.value.trim() : v.NewValue);
                    }
                    Array.add(filter, { 'Index': field.Index, 'Function': funcInfo[1], 'Values': values });
                }
                else
                    Array.add(filter, { 'Index': field.Index, 'Function': funcInfo[1], 'Values': null });
            }
            if (!success)
                return null;
            for (i = 0; i < settings.availableFields.length; i++) {
                fieldInfo = settings.availableFields[i];
                field = this._allFields[fieldInfo.Index];
                this.removeFromFilter(field);
            }
            for (i = 0; i < filter.length; i++) {
                var f = filter[i];
                this.applyFieldFilter(f.Index, f.Function, f.Values, true);
            }
            var newFilter = this._filter;
            this._filter = oldFilter;
            return newFilter;
        },
        _performSearch: function () {
            if (this._isBusy) return;
            this._saveSearchBarSettings();
            var filter = this._createSearchBarFilter(false);
            if (filter) {
                this.set_filter(filter);
                //            this.set_pageIndex(-2);
                //            this._loadPage();
                this.refreshData();
                this._setFocusOnSearchBar = true;
            }
            this._forgetSelectedRow(true);
        },
        _resetSearchBar: function () {
            if (this._isBusy) return;
            this.clearFilter();
            this._searchBarSettings[this.get_viewId()] = null;
            this._renderSearchBarControls(true);
            this._focusSearchBar();
        },
        _get_searchBarControl: function (type, visibleIndex) {
            return $get(String.format('{0}$SearchBar{1}${2}', this.get_id(), type, visibleIndex));
        },
        _saveSearchBarSettings: function () {
            var settings = this._get_searchBarSettings();
            for (var i = 0; i < settings.visibleFields.length; i++) {
                var fieldInfo = settings.visibleFields[i];
                var funcElem = this._get_searchBarControl('Function', i);
                var valElem = this._get_searchBarControl('Value', i);
                var val2Elem = this._get_searchBarControl('Value2', i);
                fieldInfo.Function = funcElem.value;
                if (valElem) {
                    valElem.value == resourcesHeaderFilter.EmptyValue ? 'null' : valElem.value;
                    fieldInfo.Value = this._formatSearchField(valElem, fieldInfo.Index);
                }
                if (val2Elem)
                    fieldInfo.Value2 = this._formatSearchField(val2Elem, fieldInfo.Index);
            }
        },
        _formatSearchField: function (input, fieldIndex) {
            var field = this._allFields[fieldIndex];
            if (field.Type.startsWith('Date')) {
                var d = Date.tryParseFuzzyDate(input.value, field.DataFormatString);
                if (d != null)
                    input.value = field.format(d);
            }
            else if (field.Type != 'String') {
                var n = Number.tryParse(input.value, field.DataFormatString);
                if (n != null)
                    input.value = field.format(n);
            }
            return input.value;
        },
        _renderSearchBarControls: function (force) {
            if (this._searchBarInitialized && !force) return;
            var sbc = $get(this.get_id() + '$SearchBarContent');
            this._searchBarInitialized = true;
            var sb = new Sys.StringBuilder();
            sb.append('<table class="SearchBarFrame">');

            var settings = this._get_searchBarSettings();

            for (var i = 0; i < settings.visibleFields.length; i++)
                this._renderSearchBarField(sb, settings, i);
            if (settings.availableFields.length > 0)
                sb.appendFormat('<tr><td colspan="3" class="AddConditionText"><a href="javascript:" onclick="$find(\'{0}\')._searchBarAddField();return false;">{3}</a></td><td class="FieldAction"><a href="javascript:" class="Add" tabindex="{1}" title="{2}" onclick="$find(\'{0}\')._searchBarAddField();return false;"><span></span></a></td>', this.get_id(), $nextTabIndex(), resourcesGrid.AddCondition, resourcesGrid.AddConditionText);

            sb.appendFormat('<tr><td><div id="{0}$SearchBarNameStub" class="Stub"></div></td><td><div id="{0}$SearchBarFuncStub" class="Stub"></div></td><td></td></tr>', this.get_id());

            sb.append('</table>');
            sb.appendFormat('<div class="SearchButtons"><button onclick="$find(\'{0}\')._performSearch();return false" tabindex="{3}" class="Search">{1}</button><br/><button onclick="$find(\'{0}\')._resetSearchBar();return false" tabindex="{4}" class="Reset">{2}</button></div>',
                this.get_id(), labelSearch, labelClear, $nextTabIndex(), $nextTabIndex());
            //if (settings.availableFields.length > 0)
            //    sb.appendFormat('<div class="SearchBarSize"><a href="javascript:" onclick="$find(\'{0}\')._searchBarAddField();return false;" class="More" tabindex="{2}"><span title="{1}"></span></a></div>', this.get_id(), resources.Grid.AddSearchBarField, $nextTabIndex());

            sbc.innerHTML = sb.toString();
            sb.clear();
            var stub = $get(this.get_id() + '$SearchBarNameStub');
            stub.style.width = stub.offsetWidth + 'px';
            stub = $get(this.get_id() + '$SearchBarFuncStub');
            stub.style.width = stub.offsetWidth + 'px';
            var selectors = sbc.getElementsByTagName('select');
            for (i = 0; i < selectors.length; i++)
                selectors[i].style.width = '100%';
            if (!this._searchBarExtenders) this._searchBarExtenders = [];
            for (i = 0; i < settings.visibleFields.length; i++) {
                var fieldInfo = settings.visibleFields[i];
                var field = this._allFields[fieldInfo.Index];
                var valElem = this._get_searchBarControl('Value', i);
                if (valElem) {
                    if (fieldInfo.Function.match(/\$(in|notin),/) == null) {
                        var c = this._createFieldInputExtender('SearchBar', field, valElem, i);
                        if (c) Array.add(this._searchBarExtenders, c);
                    }
                    else {
                        var parentRow = valElem;
                        while (parentRow && parentRow.tagName != 'TR')
                            parentRow = parentRow.parentNode;
                        for (var j = 0; j < parentRow.childNodes.length; j++)
                            parentRow.childNodes[j].vAlign = 'top';
                    }
                }
                var val2Elem = this._get_searchBarControl('Value2', i);
                if (val2Elem) {
                    c = this._createFieldInputExtender('SearchBar', field, val2Elem, i + '$2');
                    if (c) Array.add(this._searchBarExtenders, c);
                }
            }
        },
        _updateSearchBar: function () {
            var searchBar = this._get('$SearchBar');
            if (!searchBar) return;
            var isVisible = this.get_searchBarIsVisible();
            var sba = this._get('$SearchBarActivator');
            if (sba)
                if (isVisible)
                    Sys.UI.DomElement.addCssClass(sba, 'Activated');
                else
                    Sys.UI.DomElement.removeCssClass(sba, 'Activated');
            Sys.UI.DomElement.setVisible(searchBar, isVisible);
            if (isVisible)
                this._renderSearchBarControls(searchBar);
            if (sba) {
                Sys.UI.DomElement.setVisible(this._get('$QuickFind'), !isVisible);
                var searchToggle = this._get('$SearchToggle');
                if (this._hasSearchAction && this._hasSearchShortcut)
                    searchToggle.title = labelSearch;
                else
                    searchToggle.title = this.get_searchBarIsVisible() ? resourcesGrid.HideAdvancedSearch : resourcesGrid.ShowAdvancedSearch;
            }
            var infoRow = this._get('$InfoRow');
            if (infoRow) {
                if (isVisible)
                    Sys.UI.DomElement.addCssClass(infoRow, 'WithSearchBar');
                else
                    Sys.UI.DomElement.removeCssClass(infoRow, 'WithSearchBar');
            }
            if (this._setFocusOnSearchBar) {
                this._setFocusOnSearchBar = false;
                this._focusSearchBar();
            }
        },
        _renderSearchBarActivator: function (sb) {
            if (!this.get_showSearchBar() || (!this.get_showQuickFind() && this.get_searchOnStart())) return;
            sb.appendFormat('<td class="SearchBarActivator{1}" id="{0}$SearchBarActivator"><a href="javascript:" onclick="$find(\'{0}\')._toggleSearchBar();return false;" id="{0}$SearchToggle"><span></span></a></td>', this.get_id(), this._hasSearchAction && this._hasSearchShortcut ? ' Search' : '');
            if (!this.get_showQuickFind())
                sb.append('<td class="Divider"><div></div></td>');
        },
        _internalRenderActionBar: function (sb) {
            var groups = this.get_actionGroups('ActionBar');
            sb.append('<table cellpadding="0" cellspacing="0" class="Groups"><tr>');
            var isGrid = this.get_isGrid();
            if (isGrid/*view.Type == 'Grid'*/)
                this._renderSearchBarActivator(sb);
            if (isGrid/*view.Type == 'Grid'*/ && this.get_showQuickFind()) {
                var s = this.get_quickFindText();
                sb.appendFormat('<td class="QuickFind" title="{2}" id="{0}$QuickFind"><div class="QuickFind"><table cellpadding="0" cellspacing="0"><tr><td><input type="text" id="{0}_QuickFind" value="{1}" class="{3}" tabindex="{4}"/></td><td class="Button"><a href="#" onclick="$find(\'{0}\').quickFind();return false;"><span>&nbsp;</span></a></td></tr></table></div></td>',
                    this.get_id(), _app.htmlAttributeEncode(s), resourcesGrid.QuickFindToolTip, s == resourcesGrid.QuickFindText ? 'Empty' : 'NonEmpty', $nextTabIndex());
                sb.append('<td class="Divider"><div></div></td>');
                if (this.get_lookupField() && !isNullOrEmpty(this.get_lookupField().ItemsNewDataView)) {
                    sb.appendFormat('<td class="QuickCreateNew"><a href="javascript:" onclick="$find(\'{0}\').closeLookupAndCreateNew();return false;" class="CreateNew" title="{1}" tabindex="{2}><span class="Placeholder"></span></a></td>', this.get_id(), resources.Lookup.GenericNewToolTip, $nextTabIndex());
                }
            }
            else {
                if (groups.length == 0 || this.get_lookupField())
                    sb.append('<td class="Divider"><div style="visibility:hidden"></div></td>');
            }


            if (!this.get_lookupField()) {
                // create action bar items
                this._registerActionBarItems();
                // render action group
                var showChartGroup = this.get_isChart() && !this.get_showViewSelector();
                if (showChartGroup)
                    sb.appendFormat('<td class="Group Main" onmouseover="$showHover(this,&quot;{0}${1}$ActionGroup$Chart&quot;,&quot;ActionGroup&quot;)" onmouseout="$hideHover(this)" onclick="$toggleHover()"><span class="Outer"><a href="javascript:" onfocus="$showHover(this,&quot;{0}${1}$ActionGroup$Chart&quot;,&quot;ActionGroup&quot;,2)" onblur="$hideHover(this)" tabindex="{3}" onclick="$hoverOver(this, 2);return false;">{2}</a></span></td>',
                        this.get_id(), this.get_viewId(), _app.htmlEncode(this.get_view().Label), $nextTabIndex());
                for (var i = 0; i < groups.length; i++) {
                    if (i > 0 || showChartGroup)
                        sb.append('<td class="Divider"><div></div></td>');
                    var group = groups[i];
                    if (group.Flat) {
                        var firstIndex = -1;
                        var lastIndex = -1;
                        for (var j = 0; j < group.Actions.length; j++) {
                            var a = group.Actions[j];
                            a._isAvailable = this._isActionAvailable(a) && !isNullOrEmpty(a.HeaderText);
                            a._isFirst = false;
                            a._isLast = false;
                            if (a._isAvailable) {
                                if (firstIndex == -1)
                                    firstIndex = j;
                                lastIndex = j;
                            }
                        }
                        if (firstIndex >= 0) {
                            group.Actions[firstIndex]._isFirst = true;
                            group.Actions[lastIndex]._isLast = true;
                        }
                        for (j = 0; j < group.Actions.length; j++) {
                            a = group.Actions[j];
                            if (a._isAvailable)
                                sb.appendFormat(
                                    '<td class="{7}Group FlatGroup{6}{8}{9}" onmouseover="$showHover(this,&quot;{0}${2}$ActionGroup${1}&quot;,&quot;ActionGroup&quot;)" onmouseout="$hideHover(this)" onclick="if(this._skip)this._skip=null;else $find(\'{0}\').executeAction(\'ActionBar\',{1},null,{2})" title="{10}"><span class="Outer">{5}<a href="javascript:" tabindex="{4}" onclick="this.parentNode.parentNode._skip=true;$find(\'{0}\').executeAction(\'ActionBar\',{1},null,{2});return false;" onfocus="$showHover(this,&quot;{0}${2}$ActionGroup${1}&quot;,&quot;ActionGroup&quot;,2)" onblur="$hideHover(this)">{3}</a></span></td>',
                                    this.get_id(), j, i, _app.htmlEncode(a.HeaderText), $nextTabIndex(),
                                    !isNullOrEmpty(a.CssClass) ? String.format('<span class="FlatGroupIcon {0}">&nbsp;</span>', _app.cssToIcon(a.CssClass)) : '',
                                    !isNullOrEmpty(a.CssClass) ? ' FlatGroupWithIcon' : '',
                                    a.CssClassEx,
                                    a._isFirst ? ' First' : '',
                                    a._isLast ? ' Last' : '', a.Description);
                        }
                    }
                    else
                        sb.appendFormat('<td class="{5}Group" onmouseover="$showHover(this,&quot;{0}${1}$ActionGroup${2}&quot;,&quot;ActionGroup&quot;)" onmouseout="$hideHover(this)" onclick="$toggleHover()"><span class="Outer"><a href="javascript:" onfocus="$showHover(this,&quot;{0}${1}$ActionGroup${2}&quot;,&quot;ActionGroup&quot;,2)" onblur="$hideHover(this)" tabindex="{4}" onclick="$hoverOver(this, 2);return false;">{3}</a></span></td>',
                            this.get_id(), this.get_viewId(), i, group.HeaderText, $nextTabIndex(), group.CssClassEx);
                }
            }
            sb.append('</tr></table>');
        },
        _renderActionBar: function (sb) {
            if (!this.get_showActionBar()) {
                this._registerActionBarItems();
                return;
            }
            sb.appendFormat('<tr class="ActionRow"><td colspan="{0}"  class="ActionBar">', this._get_colSpan());
            sb.appendFormat('<table style="width:100%" cellpadding="0" cellspacing="0"><tr><td style="width:100%" id="{0}$ActionBar">', this.get_id());

            this._internalRenderActionBar(sb);

            this._registerViewSelectorItems();
            sb.append('</td><td class="ViewSelectorControl">');
            if (this.get_showViewSelector()) {
                sb.appendFormat('<table cellpadding="0" cellspacing="0"><tr><td class="ViewSelectorLabel">{0}:</td><td>', resources.ActionBar.View);
                sb.appendFormat('<span class="ViewSelector" onmouseover="$showHover(this,&quot;{0}$ViewSelector&quot;,&quot;ViewSelector&quot;)" onmouseout="$hideHover(this)" onclick="$toggleHover()"><span class="Outer"><span class="Inner"><a href="javascript:" class="Link" tabindex="{2}" onfocus="$showHover(this,&quot;{0}$ViewSelector&quot;,&quot;ViewSelector&quot;,3)" onblur="$hideHover(this)">{1}</a></span></span></span>',
                    this.get_id(), _app.htmlEncode(this.get_view().Label), $nextTabIndex());
                sb.append('</td></tr></table>');
            }
            sb.append('</td></tr></table>');
            sb.append('</td></tr>');
        },
        _renderStatusBar: function (sb) {
            sb.appendFormat('<tr class="StatusBarRow" style="display:none"><td colspan="{1}" class="StatusBar" id="{0}$StatusBar"></td></tr>', this.get_id(), this._get_colSpan());
        },
        _updateStatusBar: function () {
            var statusBar = this.get_statusBar(),
                html,
                statusBarCell;
            if (!isNullOrEmpty(statusBar)) {
                statusBarCell = $(this._get('$StatusBar'));
                if (statusBarCell.length) {
                    html = this.statusBar();
                    if (html)
                        statusBarCell.html(html).parent().show();
                    else
                        statusBarCell.parent().hide();
                }
            }
        },
        _renderViewDescription: function (sb) {
            var showLetters = this._firstLetters && this._firstLetters.length > 2;
            var showDescription = this.get_showDescription();
            if (!showDescription && !showLetters) return;
            var t = showDescription ? this.get_description() : '';
            var lt = null;
            if (showLetters) {
                var lsb = new Sys.StringBuilder();
                lsb.append('<div class="Letters">');
                var field = this.findField(this._firstLetters[0]);
                var selectedLetter = null;
                for (var i = 0; i < this._filter.length; i++) {
                    var m = this._filter[i].match(_app._fieldFilterRegex);
                    if (m && m[1] == field.Name) {
                        m = m[2].match(/^\$beginswith\$(.+?)\0$/);
                        if (m)
                            selectedLetter = this.convertStringToFieldValue(field, m[1]);
                        break;
                    }
                }
                var beginsWith = String.format('{0} {1} ', _app.htmlAttributeEncode(field.Label), resourcesDataFilters.Text.List[2].Text.toLowerCase());
                for (i = 1; i < this._firstLetters.length; i++) {
                    var letter = this._firstLetters[i];
                    lsb.appendFormat('<a href="javascript:" onclick="$find(\'{0}\').filterByFirstLetter({1});return false;" class="Letter{5}" title="{3}{4}">{2}</a> ',
                        this.get_id(), i, letter, beginsWith, _app.htmlAttributeEncode(letter), selectedLetter == letter ? ' Selected' : '');
                }
                lsb.append('</div>');
                lt = lsb.toString();
                lsb.clear();
            }
            if (showDescription && isNullOrEmpty(t))
                t = this.get_view().HeaderText;
            //var isTree = this.get_isTree();
            if (!isNullOrEmpty(t) || this.get_lookupField() || /*isTree || */lt) {
                sb.appendFormat('<tr class="HeaderTextRow"><td colspan="{0}" class="HeaderText">', this._get_colSpan());
                if (this.get_lookupField() != null)
                    sb.append('<table style="width:100%" cellpadding="0" cellspacing="0"><tr><td style="padding:0px">');
                sb.appendFormat('<div id="{0}$HeaderText">', this.get_id());
                sb.append(this._formatViewText(resources.Views.DefaultDescriptions[t], true, t));
                sb.append('</div>');
                if (lt)
                    sb.append(lt);
                if (this.get_lookupField() != null)
                    sb.appendFormat('</td><td align="right" style="padding:0px"><a href="javascript:" class="Close" onclick="$find(\'{0}\').hideLookup();return false" tabindex="{2}" title="{1}">&nbsp;</a></td></tr></table>', this.get_id(), resourcesModalPopup.Close, $nextTabIndex());
                /*if (isTree) {
                var path = this.get_path();
                sb.append('<div class="Path">');
                sb.appendFormat('<a href="javascript:" onclick="return false" class="Toggle" title="{1}"><span>&nbsp;</span></a>', this.get_id(), _app.htmlAttributeEncode(resources.Grid.FlatTreeToggle));
                for (i = 0; i < path.length; i++) {
                var levelInfo = path[i];
                sb.appendFormat('<span class="Divider"></span><a href="javascript:" class="Node{4}" onclick="$find(\'{0}\').drillIn({1})" title="{3}">{2}</a>', this.get_id(), i,
                _app.htmlEncode(levelInfo.text),
                _app.htmlAttributeEncode(String.format(resources.Lookup.SelectToolTip, '"' + levelInfo.text + '"')),
                i == path.length - 1 ? ' Selected' : '');
                }
                sb.append('</div>');
                }*/
                sb.append('</td></tr>');
            }
        },
        _renderInfoBar: function (sb) {
            var filter = this.get_filter();
            if (filter.length > 0 && !this.filterIsExternal()) {
                var fsb = new Sys.StringBuilder();
                if (this.get_viewType() != "Form")
                    this._renderFilterDetails(fsb, filter);
                if (this.get_viewType() != "Form" && !fsb.isEmpty()) {
                    sb.appendFormat('<tr class="InfoRow {2}" id="{0}$InfoRow"><td colspan="{1}">', this.get_id(), this._get_colSpan(), this.get_viewType());
                    sb.append(fsb.toString());
                    sb.append('</td></tr>');
                }
                fsb.clear();
            }
        },
        _renderPager: function (sb, location) {
            if (this.get_showPager().indexOf(location) === -1) return;
            var isChart = this.get_isChart();
            sb.appendFormat('<tr class="FooterRow {2}PagerRow"><td colspan="{0}" class="Footer"><table cellpadding="0" cellspacing="0" style="width:100%"><tr><td align="left" class="Pager PageButtons{1}">', this._get_colSpan(), isChart ? ' Print' : '', location);
            var pageCount = this.get_pageCount();
            var pageSize = this.get_pageSize();
            if (isChart) {
                pageCount = 1;
                pageSize = this._totalRowCount;
                var printAction = this._get_specialAction('Print');
                if (printAction)
                    sb.appendFormat('<a href="javascript:" onclick="{1};return false;" title="{0}" class="Print"><span></span></a></td><td>', printAction.text, printAction.script);
            }
            if (pageCount > 1) {
                var buttonIndex = this._firstPageButtonIndex;
                var pagerButtonCount = this.get_pagerButtonCount();
                var buttonCount = pagerButtonCount;
                if (this.get_pageIndex() > 0)
                    sb.appendFormat('<a href="#" onclick="$find(\'{1}\').goToPage({0},true);return false" class="PaddedLink" tabindex="{3}">{2}</a>', this.get_pageIndex() - 1, this.get_id(), resourcesPager.Previous, $nextTabIndex());
                else
                    sb.appendFormat('<span class="Disabled">{0}</span>', resourcesPager.Previous);
                sb.appendFormat(' | {0}: ', resourcesPager.Page);
                if (buttonIndex > 0)
                    sb.appendFormat('<a href="#" onclick="$find(\'{1}\').goToPage(0,true);return false" class="PaddedLink" tabindex="{2}">1</a><a href="#" onclick="$find(\'{1}\').goToPage({0},true);return false" class="PaddedLink" tabindex="{3}">...</a>', buttonIndex - 1, this.get_id(), $nextTabIndex(), $nextTabIndex());
                while (buttonCount > 0 && buttonIndex < pageCount) {
                    if (buttonIndex == this.get_pageIndex())
                        sb.appendFormat('<span class="Selected">{0}</span>', buttonIndex + 1);
                    else
                        sb.appendFormat('<a href="#" onclick="$find(\'{1}\').goToPage({0},true);return false" class="PaddedLink" tabindex="{3}">{2}</a>', buttonIndex, this.get_id(), buttonIndex + 1, $nextTabIndex());
                    buttonIndex++;
                    buttonCount--;
                }
                if (buttonIndex <= pageCount - 1)
                    sb.appendFormat('<a href="#" onclick="$find(\'{1}\').goToPage({0},true);return false" class="PaddedLink" tabindex="{2}">...</a><a href="#" onclick="$find(\'{1}\').goToPage({3}-1,true);return false" class="PaddedLink" tabindex="{4}">{3}</a>', this._firstPageButtonIndex + pagerButtonCount, this.get_id(), $nextTabIndex(), pageCount, $nextTabIndex());
                sb.append(' | ');
                if (this.get_pageIndex() < pageCount - 1)
                    sb.appendFormat('<a href="#" onclick="$find(\'{1}\').goToPage({0},true);return false" class="PaddedLink" tabindex="{3}">{2}</a>', this.get_pageIndex() + 1, this.get_id(), resourcesPager.Next, $nextTabIndex());
                else
                    sb.appendFormat('<span class="Disabled">{0}</span>', resourcesPager.Next);
            }
            sb.append('</td><td align="right" class="Pager PageSize">&nbsp;');
            var showPageSize = this.get_showPageSize();
            var pageSizes = this._pageSizes;
            if (showPageSize && this._totalRowCount > pageSize) {
                sb.append(resourcesPager.ItemsPerPage);
                for (i = 0; i < pageSizes.length; i++) {
                    if (i > 0) sb.append(', ');
                    if (pageSize == pageSizes[i])
                        sb.appendFormat('<b>{0}</b>', pageSize);
                    else
                        sb.appendFormat('<a href="#" onclick="$find(\'{0}\').set_pageSize({1},true);return false" tabindex="{2}">{1}</a>', this.get_id(), pageSizes[i], $nextTabIndex());
                }
                sb.append(' | ');
            }
            if (this._totalRowCount > 0) {
                var lastVisibleItemIndex = (this.get_pageIndex() + 1) * pageSize;
                if (lastVisibleItemIndex > this._totalRowCount) lastVisibleItemIndex = this._totalRowCount;
                if (showPageSize)
                    sb.appendFormat(resourcesPager.ShowingItems, this.get_pageIndex() * pageSize + 1, lastVisibleItemIndex, this._totalRowCount);
                var multipleSelection = this.multiSelect();
                if (multipleSelection) {
                    sb.appendFormat('<span id="{0}$SelectionInfo">', this.get_id());
                    if (this._selectedKeyList.length > 0) sb.appendFormat(resourcesPager.SelectionInfo, this._selectedKeyList.length);
                    sb.append('</span>');
                }
                if (showPageSize || multipleSelection)
                    sb.append(' | ');
            }
            sb.appendFormat('</td><td align="center" class="Pager Refresh" id="{0}_Wait">', this.get_id());
            if (!this.get_searchOnStart())
                sb.appendFormat('<a href="#" onclick="$find(\'{0}\').{3}();return false" tabindex="{2}" title="{1}"><span>&nbsp;</span></a>', this.get_id(), resourcesPager.Refresh, $nextTabIndex(), this._hasSearchAction ? 'search' : 'sync');
            sb.append('</td></tr></table>');
            sb.append('</td></tr>');
        },
        _cname: function (name) {
            var viewId = this.get_viewId();
            if (viewId == null)
                viewId = 'grid1';
            return String.format('{0}${1}${2}', this._id, viewId, name);
        },
        readContext: function (name) {
            return Web.PageState.read(this._cname(name));
        },
        writeContext: function (name, value) {
            Web.PageState.write(this._cname(name), value);
        },
        _get_template: function (type) {
            if (this.get_isDataSheet()) return null;
            return $get(this.get_controller() + '_' + this.get_viewId() + (type ? '_' + type : ''));
        },
        _renderTemplate: function (template, sb, row, isSelected, isInlineForm) {
            var s = typeof template == 'string' ? template : template.innerHTML;
            var iterator = /([\s\S]*?)\{([\w\d]+)(\:([\S\s]+?)){0,1}\}/g;
            var lastIndex = 0;
            var match = iterator.exec(s);
            while (match) {
                lastIndex = match.index + match[0].length;
                sb.append(match[1]);
                var field = this.findField(match[2]);
                if (field) {
                    if (match[4] && match[4].length > 0)
                        sb.appendFormat('{0:' + match[4] + '}', row[field.Index]);
                    else
                        this._renderItem(sb, field, row, isSelected, isInlineForm, null, null, null, true);
                }
                else {
                    var dataView = _app.find(match[2]);
                    if (dataView) {
                        if (!this._embeddedViews)
                            this._embeddedViews = [];
                        Array.add(this._embeddedViews, { 'view': dataView });
                        sb.appendFormat('<div id="v_{0}" class="EmbeddedViewPlaceholder"></div>', dataView.get_id());
                    }
                }

                match = iterator.exec(s);
            }
            if (lastIndex < s.length) sb.append(s.substring(lastIndex));
        },
        _renderNewRow: function (sb) {
            if (this.inserting()) {
                var isDataSheet = this.get_isDataSheet();
                var hasActionColumn = this._actionColumn && !isDataSheet;
                var cell = this._get_focusedCell();
                if (!cell) cell = { colIndex: 0 };

                var t = isDataSheet ? null : this._gridTemplates.New; //this._get_template('new');
                sb.appendFormat('<tr class="Row Selected{0}{1}">', t ? ' InlineFormRow' : '', isDataSheet ? ' Inserting' : '');

                var multipleSelection = this.multiSelect();
                if (multipleSelection) sb.append('<td class="Cell Toggle First">&nbsp;</td>');
                var showIcons = this.get_showIcons();
                if (showIcons) sb.appendFormat('<td class="Cell Icons{0}"><span>&nbsp;</span></td>', !multipleSelection ? ' First' : '');
                if (this.get_isDataSheet()) sb.appendFormat('<td class="Cell Gap"><div class="Icon"></div></td>', !multipleSelection && !showIcons ? ' First' : '');
                if (hasActionColumn)
                    sb.append('<td class="Cell ActionColumn">&nbsp;</td>');
                var row = this._newRow ? this._newRow : [];
                this._mergeRowUpdates(row);
                this._updateVisibility(row);
                if (t) {
                    sb.appendFormat('<td class="Cell" colspan="{0}">', this.get_fields().length);
                    this._renderTemplate(t, sb, row, true, true);
                    sb.append('</td>');
                }
                else {
                    for (var i = 0; i < this._fields.length; i++) {
                        var field = this._fields[i];
                        var af = this._allFields[field.AliasIndex];
                        var cellEvents = '';

                        if (isDataSheet) {
                            this._editing = cell && cell.colIndex == field.ColIndex;
                            if (!this._editing)
                                cellEvents = String.format(' onclick="$find(\'{0}\')._dataSheetCellFocus(event,-1,{1})"', this.get_id(), i);
                        }
                        sb.appendFormat('<td class="Cell {0} {1}Type{2}{3}"{4}>', af.Name, af.Type, i == 0 ? ' FirstColumn' : '', i == this._fields.length - 1 ? ' LastColumn' : '', cellEvents)
                        if (!field.ReadOnly) sb.appendFormat('<div class="Error" id="{0}_Item{1}_Error" style="display:none"></div>', this.get_id(), field.Index);

                        this._renderItem(sb, field, row, !field.OnDemand, null);
                        this._editing = null;
                        sb.append('</td>');
                    }
                }
                sb.append('</tr>');
                if (!isDataSheet)
                    this._renderActionButtons(sb, 'Bottom', 'Row')
            }
        },
        _iconClicked: function (rowIndex) {
            if (!this.get_isDataSheet() && this.get_lookupField() == null)
                if (this._icons && this._icons[rowIndex] == 'Attachment') {
                    this._lastClickedIcon = 'Attachment';
                    this.set_autoSelectFirstRow(true);
                    this._autoSelect(rowIndex);
                }
        },
        _renderRows: function (sb, hasKey, multipleSelection) {
            var isInLookupMode = this.get_lookupField() != null;
            var isDataSheet = this.get_isDataSheet();
            var hasActionColumn = !isInLookupMode && this._actionColumn && !isDataSheet;
            var actionColumnGroup = hasActionColumn ? this.get_actionGroups('ActionColumn', true) : null;
            var expressions = this._enumerateExpressions(Web.DynamicExpressionType.Any, Web.DynamicExpressionScope.ViewRowStyle, this.get_viewId());
            sb.append('<tr class="HeaderRow">');
            var showIcons = this.get_showIcons();
            if (multipleSelection) {
                sb.appendFormat('<th class="Toggle First"><input type="checkbox" onclick="$find(&quot;{0}&quot;).toggleSelectedRow()" id="{0}_ToggleButton"/></th>', this.get_id());
                this._multipleSelection = false;
            }
            if (showIcons) sb.appendFormat('<th class="Icons{0}">&nbsp;</th>', !multipleSelection ? ' First' : '');
            if (isDataSheet) sb.appendFormat('<th class="Gap{0}">&nbsp;</th>', !multipleSelection && !showIcons ? ' First' : '');
            if (hasActionColumn) sb.appendFormat('<th class="FieldHeaderSelector ActionColumn"><span>{0}</span></th>', this._actionColumn);
            var sortExpression = this.get_sortExpression(),
                sortExprInfo = sortExpression ? sortExpression.match(/^\s*(\w+)((\s+(asc|desc))|(\s*(,|$)))/i) : null;
            for (var i = 0; i < this._fields.length; i++) {
                var field = this._fields[i],
                    originalFieldName = field.Name;
                field = this._allFields[field.AliasIndex];
                if (field.Name == originalFieldName)
                    originalFieldName = '';
                sb.appendFormat('<th class="FieldHeaderSelector {4} {0} {1}Type{2}{3}"', field.Name, field.Items.length > 0 ? 'String' : field.Type, i == 0 ? ' FirstColumn' : '', i == this._fields.length - 1 ? ' LastColumn' : '', originalFieldName);
                if (field.AllowSorting || field.AllowQBE)
                    sb.appendFormat(' onmouseover="$showHover(this,\'{0}$FieldHeaderSelector${1}\',\'FieldHeaderSelector\')" onmouseout="$hideHover(this)" onclick="$toggleHover()"', this.get_id(), i);
                sb.append('>');
                if (field.AllowSorting) {
                    sb.appendFormat('<a href="#" onclick="$find(\'{0}\').sort(\'{1}\');$preventToggleHover();return false" title="{3}" onfocus="$showHover(this,\'{0}$FieldHeaderSelector${4}\',\'FieldHeaderSelector\',1)" onblur="$hideHover(this)" tabindex="{5}">{2}</a>',
                        this.get_id(), field.Name, field.HeaderText, String.format(resourcesHeaderFilter.SortBy, field.HeaderText), i, $nextTabIndex());
                    if (sortExprInfo && sortExprInfo[1] == field.Name)
                        sb.append(String.format('<span class="{0}">&nbsp;</span>', sortExprInfo[4] ? (sortExprInfo[4].toLowerCase() == 'asc' ? 'SortUp' : 'SortDown') : 'SortUp'));
                    if (this.filterOf(field) != null)
                        sb.append('<span class="Filter">&nbsp;</span>');
                }
                else
                    sb.appendFormat('<span>{0}</span>', field.HeaderText);
                sb.append('</th>');
            }
            sb.append('</tr>');
            var cell = this._get_focusedCell();
            var isEditing = this.editing();
            var isInserting = this.inserting();
            var newRowIndex = this._lastSelectedRowIndex;
            if (!this._gridTemplates) {
                var gt = { 'Default': this._get_template(), 'Edit': this._get_template('edit'), 'New': this._get_template('new') };
                if (gt.Default)
                    gt.Default = gt.Default.innerHTML;
                gt.Edit = gt.Edit ? gt.Edit.innerHTML : gt.Default;
                gt.New = gt.New ? gt.New.innerHTML : gt.Default;
                this._gridTemplates = gt;
            }
            var t = isDataSheet ? null : this._gridTemplates.Edit; //isEditing ? this._get_template('edit') : null;
            var ts = isDataSheet ? null : this._gridTemplates.Default;
            var family = null;
            this._registerRowSelectorItems();
            var mouseOverEvents = 'onmouseover="$(this).addClass(\'Highlight\');" onmouseout="$(this).removeClass(\'Highlight\')"';
            var showRowNumber = this.get_showRowNumber();
            var hasSelectedRow = false;
            for (i = 0; i < this.get_rows().length; i++) {
                var row = this.get_rows()[i];
                var customCssClasses = ' ' + this._evaluateJavaScriptExpressions(expressions, row, true);
                var isSelectedRow = this._rowIsSelected(i);
                if (isSelectedRow)
                    hasSelectedRow = true;
                if (isSelectedRow) this._selectedRowIndex = i;
                var checkBoxCell = null;
                var multiSelectedRowClass = '';
                if (multipleSelection) {
                    var selected = Array.indexOf(this._selectedKeyList, this._createRowKey(i)) != -1;
                    if (selected) this._multipleSelection = true;
                    checkBoxCell = String.format('<td class="Cell Toggle First"><input type="checkbox" id="{0}_CheckBox{1}" onclick="$find(&quot;{0}&quot;).toggleSelectedRow({1})"{2} class="MultiSelect{3}"/></td>', this.get_id(), i, selected ? ' checked="checked"' : null, selected ? ' Selected' : '');
                    if (selected) multiSelectedRowClass = ' MultiSelectedRow';
                }
                var iconCell = showIcons ? String.format('<td class="Cell Icons {0}{1}"><span onclick="$find(\'{3}\')._iconClicked({4});">{2}</span></td>', this._icons ? this._icons[i] : '', !multipleSelection ? ' First' : '', showRowNumber ? this.get_pageSize() * this.get_pageIndex() + i + 1 + (this._pageOffset ? this._pageOffset : 0) : '&nbsp;', this.get_id(), i) : '';
                if (isDataSheet)
                    iconCell += String.format('<td class="Cell Gap{2}" onclick="$find(\'{0}\')._dataSheetCellFocus(event,{1},-1)"><div class="Icon"></div></td>', this.get_id(), i, !multipleSelection && !showIcons ? ' First' : '');
                if (hasActionColumn)
                    iconCell += this._renderActionColumnCell(row, i, isSelectedRow, actionColumnGroup)
                if (isEditing && isSelectedRow) {
                    this._mergeRowUpdates(row);
                    this._updateVisibility(row);
                }
                if (isSelectedRow && (isEditing && t || ts)) {
                    sb.appendFormat('<tr id="{0}_Row{1}" class="{2}Row{3} Selected{7}">{5}{6}<td class="Cell" colspan="{4}">', this.get_id(), i, i % 2 == 0 ? '' : 'Alternating', ' InlineFormRow', this.get_fields().length, checkBoxCell, iconCell, isEditing ? ' Editing' : '');
                    this._renderTemplate(isEditing && t ? t : ts, sb, row, true, true);
                    sb.append('</td>');
                }
                else {
                    sb.appendFormat('<tr id="{0}_Row{1}" class="{2}Row{3}{4}{7}" {6}>', this.get_id(), i, i % 2 == 0 ? '' : 'Alternating', isSelectedRow ? ' Selected' + customCssClasses : customCssClasses, multiSelectedRowClass, hasKey ? '' : ' ReadOnlyRow', isDataSheet && !isInLookupMode ? '' : mouseOverEvents, isSelectedRow && isEditing ? ' Editing' : ''/*,
                    !isEditing && isDataSheet ? String.format(' onmousewheel="$find(\'{0}\')._scrollToRow(event.wheelDelta);return false;"', this.get_id()) : ''*/);
                    if (checkBoxCell) sb.append(checkBoxCell);
                    sb.append(iconCell);
                    for (j = 0; j < this._fields.length; j++) {
                        field = this._fields[j];
                        var af = this._allFields[field.AliasIndex];
                        originalFieldName = field.Name == af.Name ? '' : field.Name;
                        if (cell)
                            this._editing = isEditing && cell.rowIndex == i && cell.colIndex == field.ColIndex;
                        var allowRowSelector = j == 0 && hasKey;
                        if (allowRowSelector) {
                            family = _web.HoverMonitor.Families[String.format('{0}$RowSelector${1}', this.get_id(), i)];
                            if (!family || family.items.length == 0)
                                allowRowSelector = false;
                        }
                        var firstColumnClass = j == 0 ? ' FirstColumn' : '';
                        var cellClickEvent = String.format(' onclick="$find(\'{0}\')._{3}CellFocus(event,{1},{2})"', this.get_id(), i, j, isDataSheet && !isInLookupMode ? 'dataSheet' : 'gridView');
                        //if (isDataSheet)
                        //    cellClickEvent += String.format(' onclick="$find(\'{0}\')._dataSheetCellEdit(event,{1},{2})"', this.get_id(), i, j, isDataSheet ? 'dataSheet' : 'gridView');
                        var lastColumnClass = j == this._fields.length - 1 ? ' LastColumn' : '';
                        if (allowRowSelector && !isInLookupMode || isSelectedRow && isEditing || field.OnDemand && isSelectedRow)
                            sb.appendFormat('<td class="Cell {5} {0} {1}Type{2}{4}"{3}>', af.Name, field.Items.length > 0 ? 'String' : af.Type, firstColumnClass, isSelectedRow && isEditing && (!isDataSheet || cell && cell.colIndex == field.ColIndex) ? '' : cellClickEvent, lastColumnClass, originalFieldName);
                        else
                            sb.appendFormat('<td class="Cell {7} {2} {3}Type{4}{6}" style="cursor:default;"{5}>', this.get_id(), i, af.Name, af.Type == 'Byte[]' ? 'Binary' : (field.Items.length > 0 ? 'String' : af.Type), firstColumnClass, cellClickEvent, lastColumnClass, originalFieldName);
                        if (isSelectedRow && isEditing && !field.ReadOnly) sb.appendFormat('<div class="Error" id="{0}_Item{1}_Error" style="display:none"></div>', this.get_id(), field.Index);
                        if (allowRowSelector) {
                            //var family = Web.HoverMonitor.Families[String.format('{0}$RowSelector${1}', this.get_id(), i)];
                            if (!isInLookupMode && family && family.items.length > 1)
                                sb.appendFormat('<div id="{0}_RowSelector{1}" class="RowSelector" onmouseover="$showHover(this, \'{0}$RowSelector${1}\', \'RowSelector\')" onmouseout="$hideHover(this)" onclick="$toggleHover()">', this.get_id(), i);
                            if (!(isSelectedRow && isEditing)) {
                                var focusEvents = isInLookupMode || !family || family.items.length == 1 ? '' : String.format(' onfocus="$showHover(this, \'{0}$RowSelector${1}\', \'RowSelector\', 1)" onblur="$hideHover(this)" ', this.get_id(), i);
                                if (!isInLookupMode) sb.appendFormat('<a href="#" onclick="$hoverOver(this, 2);$find(\'{0}\').executeAction(\'Grid\',-1,{1});$preventToggleHover();return false" tabindex="{2}"{3}>', this.get_id(), i, $nextTabIndex(), focusEvents); else sb.appendFormat('<a href="javascript:" onclick="return false" tabindex="{0}">', $nextTabIndex());
                            }
                        }
                        this._renderItem(sb, field, row, isSelectedRow, null, allowRowSelector);
                        if (allowRowSelector && !isEditing) {
                            if (!(isSelectedRow && isEditing)) sb.append('</a>');
                            if (!isInLookupMode && family && family.items.length > 1) sb.append('</div>');
                        }
                        sb.append('</td>');
                        if (cell)
                            this._editing = null;
                    }
                }
                sb.append('</tr>');
                if (isSelectedRow && cell == null)
                    this._renderActionButtons(sb, 'Bottom', 'Row');
                if (isInserting && newRowIndex == i) {
                    newRowIndex = -2;
                    this._renderNewRow(sb);
                }
                if (this._syncFocusedCell && cell && isSelectedRow)
                    cell.rowIndex = i;
            }
            if (isInserting && newRowIndex != -2) this._renderNewRow(sb);
            if (this._saveAndNew) {
                this._saveAndNew = false;
                if (this._syncFocusedCell)
                    this.newDataSheetRow();
                else {
                    cell = this._get_focusedCell();
                    if (cell) {
                        cell.colIndex = 0;
                        this._moveFocusToNextRow(cell, this.get_pageSize());
                    }
                }
            }
            this._syncFocusedCell = false;
            if (!hasSelectedRow)
                this._selectedRowIndex = null;
        },
        _renderActionColumnCell: function (row, rowIndex, isSelectedRow, actionGroups) {
            this._clonedRow = row;
            if (!isSelectedRow) {
                var lastCommandName = this.get_lastCommandName();
                var lastCommandArgument = this.get_lastCommandArgument();
                this.set_lastCommandName('Select')
                this.set_lastCommandArgument(null);
            }
            var sb = new Sys.StringBuilder();
            sb.append('<td class="Cell ActionColumn">');
            //sb.append('Edit | Del');
            var first = true;
            for (var i = 0; i < actionGroups.length; i++) {
                var ag = actionGroups[i];
                for (var j = 0; j < ag.Actions.length; j++) {
                    var a = ag.Actions[j];
                    if (this._isActionAvailable(a)) {
                        if (first)
                            first = false;
                        else
                            sb.append('<span class="Divider">&nbsp;</span>');
                        //this.executeAction(scope, actionindex, rowindex, groupindex);
                        sb.appendFormat('<a href="javascript:" onclick="var dv=$find(\'{0}\');dv.executeAction(\'ActionColumn\',{2},{4},{3});return false;" class="{6}"><span class="Outer"><span class="Inner"><span class="Self" title="{5}">{1}</span></span></span></a>',
                            this.get_id(), _app.htmlEncode(a.HeaderText), j, i, rowIndex, _app.htmlEncode(a.Description), a.CssClass);
                    }
                }
            }
            if (first)
                sb.append('&nbsp;');
            sb.append('</td>');
            var result = sb.toString();
            sb.clear();
            this._clonedRow = null;
            if (!isSelectedRow) {
                this.set_lastCommandName(lastCommandName);
                this.set_lastCommandArgument(lastCommandArgument);
            }
            return result;
        },
        _skipNextInputListenerClickEvent: function () {
            if (sysBrowser.agent != sysBrowser.InternetExplorer || sysBrowser.version >= 9)
                this._skipClickEvent = true;
        },
        _gridViewCellFocus: function (event, rowIndex, colIndex) {
            try {
                var ev = new Sys.UI.DomEvent(event);
                var eventTarget = ev.target;
                if ((eventTarget.tagName === 'A' || eventTarget.parentNode.tagName === 'A') && !this.get_lookupField() || Sys.UI.DomElement.containsCssClass(eventTarget, 'RowSelector')) return false;
                if (eventTarget.tagName === 'SPAN' && eventTarget.className === 'ObjectRef')
                    return false;
                if (this.get_lookupField()) {
                    ev.stopPropagation();
                    ev.preventDefault();
                }
                this._skipNextInputListenerClickEvent();
            }
            catch (ex) {
                // do nothing
            }
            this.executeRowCommand(rowIndex, 'Select');
            return true;
        },
        _dataSheetCellFocus: function (event, rowIndex, colIndex) {
            var fc = this._get_focusedCell();
            var inserting = this.inserting();
            if (inserting && rowIndex != -1)
                rowIndex = -1;
            if (colIndex == -1)
                colIndex = fc != null ? fc.colIndex : 0;
            if (this.editing() && fc) {
                this._focusCell(-1, -1, false);
                this._focusCell(rowIndex, colIndex);
                var thisRow = rowIndex == fc.rowIndex || inserting && rowIndex == -1;
                if (!thisRow && !this._updateFocusedRow(fc) || !this._updateFocusedCell(fc)) {
                    this._focusCell(rowIndex, colIndex, false);
                    this._focusCell(fc.rowIndex, fc.colIndex);
                }
                else if (thisRow && (rowIndex != this._selectedRowIndex && !inserting))
                    this.cancelDataSheetEdit();
                this._skipNextInputListenerClickEvent();
                return;
            }
            if (!event)
                this._skipNextInputListenerClickEvent();
            else if (!this._gridViewCellFocus(event, rowIndex, colIndex))
                return;
            if (fc != null && fc.rowIndex == rowIndex && fc.colIndex == colIndex && !this.editing() && !this.get_lookupField()) {
                if (document.selection)
                    document.selection.clear();
                if (this._skipEditOnClick != true && this._allowEdit())
                    this.editDataSheetRow(fc.rowIndex);
            }
            else
                this._startInputListenerOnCell(rowIndex, colIndex);
            this._skipEditOnClick = false;
        },
        _startInputListenerOnCell: function (rowIndex, colIndex) {
            this._startInputListener();
            this._focusCell(-1, -1, false);
            this._focusCell(rowIndex, colIndex);
            if (!this.get_lookupField()) {
                if (_app._activeDataSheetId != this.get_id()) {
                    var dv = $find(_app._activeDataSheetId);
                    if (dv)
                        dv.cancelDataSheet();
                    _app._activeDataSheetId = this.get_id();
                }
                this._lostFocus = false;
            }
        },
        _startInputListener: function () {
            this._stopInputListener();
            if (!this._inputListenerKeyDownHandler) {
                this._inputListenerKeyDownHandler = Function.createDelegate(this, this._inputListenerKeyDown);
                this._inputListenerKeyPressHandler = Function.createDelegate(this, this._inputListenerKeyPress);
                this._inputListenerClickHandler = Function.createDelegate(this, this._inputListenerClick);
                this._inputListenerDblClickHandler = Function.createDelegate(this, this._inputListenerDblClick);
                this._focusedCell = null;
            }
            $addHandler(document, 'keydown', this._inputListenerKeyDownHandler);
            $addHandler(document, 'keypress', this._inputListenerKeyPressHandler);
            $addHandler(document, 'click', this._inputListenerClickHandler);
            $addHandler(document, 'dblclick', this._inputListenerDblClickHandler);
            this._trackingInput = true;
        },
        _stopInputListener: function () {
            if (!this._trackingInput) return;
            $removeHandler(document, 'keydown', this._inputListenerKeyDownHandler);
            $removeHandler(document, 'keypress', this._inputListenerKeyPressHandler);
            $removeHandler(document, 'click', this._inputListenerClickHandler);
            $removeHandler(document, 'dblclick', this._inputListenerDblClickHandler);
            this._lostFocus = true;
            this._trackingInput = false;
        },
        cancelDataSheetEdit: function () {
            if (this.editing()) {
                var fc = this._get_focusedCell();
                if (fc != null)
                    this.executeRowCommand(fc.rowIndex, 'Cancel', null, false);
                return true;
            }
            else
                return false;
        },
        _inputListenerClick: function (e) {
            if (this._skipClickEvent) {
                this._skipClickEvent = false;
                return;
            }
            if (this._lookupIsActive) return;
            var elem = e.target;
            var isThisContainer = false;
            var isDataCell = false;
            var keepFocus = true;
            while (elem != null) {
                if (elem == this._container) {
                    isThisContainer = true;
                    break;
                }
                if (elem.className != null) {
                    if (elem.className.match(/Cell|Group|InfoRow|FieldHeaderSelector|Toggle|FooterRow|ActionRow\s*/))
                        isDataCell = true;
                    else if (elem.className.match(/QuickFind|SearchBarFrame\s*/))
                        keepFocus = false;
                }

                elem = elem.parentNode;
            }
            if (!isThisContainer)
                this.cancelDataSheet();
            else {
                if (keepFocus)
                    this._lostFocus = !isDataCell;
                else
                    this._lostFocus = true;
                this._skipEditOnClick = true;
                if (!isDataCell)
                    this.cancelDataSheetEdit();
            }
        },
        _inputListenerDblClick: function (e) {
            if (this._lostFocus) return;
            var fc = this._get_focusedCell();
            if (!fc || this.editing() || !this._allowEdit()) return;
            //this.executeRowCommand(fc.rowIndex, 'Edit', this.get_viewId(), false);
            if (document.selection)
                document.selection.clear();
            this.editDataSheetRow(fc.rowIndex);
        },
        _get_focusedCell: function () {
            return this._focusedCell;
        },
        _focusCell: function (rowIndex, colIndex, highlight) {
            if (!this.get_isDataSheet()) {
                this._focusedCell = null;
                return null;
            }
            var inserting = this.inserting();
            if (highlight == null)
                highlight = true;
            if (rowIndex == -1 && colIndex == -1) {
                if (!this._focusedCell) return null;
                rowIndex = this._focusedCell.rowIndex;
                colIndex = this._focusedCell.colIndex;
            }
            if (rowIndex >= this._rows.length)
                rowIndex = this._rows.length - 1;
            if (colIndex >= this._fields.length)
                colIndex = this._fields.length - 1;
            var tableRows = this._container.childNodes[0].rows;
            var currentRowIndex = -1;

            for (var i = 0; i < tableRows.length; i++) {
                var row = tableRows[i];
                if (Sys.UI.DomElement.containsCssClass(row, 'Row') || Sys.UI.DomElement.containsCssClass(row, 'AlternatingRow'))
                    currentRowIndex++;
                if (inserting) {
                    if (Sys.UI.DomElement.containsCssClass(row, 'Inserting'))
                        break;
                }
                else if (currentRowIndex === rowIndex)
                    break;
            }
            if (currentRowIndex < 0) return null;
            var currentColIndex = -1;
            for (i = 0; i < row.childNodes.length; i++) {
                var cell = row.childNodes[i + this.get_sysColCount()];
                if (cell && Sys.UI.DomElement.containsCssClass(cell, 'Cell'))
                    currentColIndex++;
                if (currentColIndex === colIndex)
                    break;
            }
            if (currentColIndex < 0) return null;
            var gapCell = cell.parentNode.childNodes[this.get_sysColCount() - 1];
            var headerRow = this._get_headerRowElement();
            var headerCell = headerRow.childNodes[colIndex + this.get_sysColCount()];
            if (highlight === true) {
                var headerCellBounds = $common.getBounds(headerCell);
                Sys.UI.DomElement.addCssClass(cell, 'Focused');
                Sys.UI.DomElement.addCssClass(gapCell, 'CrossHair');
                Sys.UI.DomElement.addCssClass(headerCell, 'CrossHair');
                if (!this._skipCellFocus) {
                    var scrolling = _app.scrolling(); // $common.getScrolling();
                    var clientBounds = $common.getClientBounds();
                    var cellBounds = $common.getBounds(cell);
                    if (scrolling.y > cellBounds.y)
                        (!currentRowIndex ? headerCell : cell).scrollIntoView(true);
                    else if (scrolling.y + clientBounds.height <= cellBounds.y + cellBounds.height)
                        cell.scrollIntoView(false);
                    else if (scrolling.x > cellBounds.x || scrolling.x + clientBounds.width - 1 <= cellBounds.x || scrolling.x + clientBounds.width - 1 <= cellBounds.x + cellBounds.width)
                        cell.scrollIntoView(false);
                    if (sysBrowser.agent == sysBrowser.InternetExplorer/* && this.editing()*/) {
                        var rb = $common.getBounds(headerRow);
                        headerRow.style.height = rb.height + 'px';
                    }
                }
                var headerCellBounds2 = $common.getBounds(headerCell);
                if (headerCellBounds.width !== headerCellBounds2.width || headerCellBounds.x !== headerCellBounds2.x || headerCellBounds.y !== headerCellBounds2.y)
                    Sys.UI.DomElement.addCssClass(headerCell, 'Narrow');
                this._skipCellFocus = false;
            }
            else {
                Sys.UI.DomElement.removeCssClass(cell, 'Focused');
                Sys.UI.DomElement.removeCssClass(cell, 'Narrow');
                Sys.UI.DomElement.removeCssClass(gapCell, 'CrossHair');
                Sys.UI.DomElement.removeCssClass(headerCell, 'CrossHair');
            }
            this._focusedCell = { 'rowIndex': rowIndex, 'colIndex': colIndex };
            return cell;
        },
        _initializeModalPopup: function () {
            Sys.UI.DomElement.addCssClass(this.get_element(), 'ModalPlaceholder');
            var cb = $common.getClientBounds();
            var width = cb.width / 5 * 4;
            var maxWidth = resourcesModalPopup.MaxWidth;
            var confirmContext = this.get_confirmContext();
            if (confirmContext && confirmContext.MaxWidth > 0 && confirmContext.MaxWidth < width)
                maxWidth = confirmContext.MaxWidth;
            if (width > maxWidth)
                width = maxWidth;
            var height = cb.height / 5 * 4;
            if (this._container.style.overflowX != null) {
                this._container.style.overflowY = 'auto';
                this._container.style.overflowX = 'hidden';
            }
            else
                this._container.style.overflow = 'auto';
            this._container.style.height = height + 'px';
            this._container.style.width = width + 'px';
            this._saveTabIndexes();
            this._modalPopup = $create(AjaxControlToolkit.ModalPopupBehavior, { id: this.get_id() + 'ModalPopup' + _Sys_Application.getComponents().length, PopupControlID: this.get_element().id, DropShadow: true, BackgroundCssClass: 'ModalBackground' }, null, null, this.get_modalAnchor());
            this._modalPopup.show();
        },
        _internalFocus: function () {
            var elem = $get(this._focusId);
            if (elem)
                try {
                    elem.value = '';
                    elem.value = this._focusText;
                    Sys.UI.DomElement.setCaretPosition(elem, this._focusText.length);
                }
                catch (err) {
                    // do nothing
                }
        },
        _showFieldError: function (field, message) {
            var error = this._get('_Item', field.Index + '_Error');
            if (error) {
                Sys.UI.DomElement.setVisible(error, message != null);
                if (message) {
                    this._skipErrorReset = true;
                    error.style.marginLeft = '0px';
                    error.style.marginTop = '0px';
                    error.innerHTML = String.format('{0} <a href="javascript:" onclick="Sys.UI.DomElement.setVisible(this.parentNode, false);$find(\'{2}\')._focus(\'{3}\');return false" class="Close" title="{1}"><span>&nbsp;</span></a>', message, resourcesModalPopup.Close, this.get_id(), field.Name);
                    if (this.get_isForm()) {
                        var pp = $common.getPaddingBox(error.previousSibling ? error.previousSibling : error);
                        error.style.marginLeft = pp.left + 'px';
                        error.style.marginTop = 1 + 'px';
                    }
                    else {
                        var scrolling = _app.scrolling(); // $common.getScrolling();
                        var cb = $common.getClientBounds();
                        var eb = $common.getBounds(error);
                        var deltaX = eb.x + eb.width - (scrolling.x + cb.width);
                        if (deltaX < 0)
                            deltaX = 0;
                        var pb = $common.getBounds(error.parentNode);
                        pp = $common.getPaddingBox(error.parentNode);
                        var nextSibling = error.nextSibling;
                        while (nextSibling && nextSibling.nodeType != 1)
                            nextSibling = nextSibling.nextSibling;
                        var b = $common.getBounds(nextSibling ? nextSibling : error);
                        error.style.marginLeft = (-(b.x - pb.x + 1 + deltaX)) + 'px';
                        error.style.marginTop = (b.height + pp.bottom) + 'px'; //(pb.height - (b.y - pb.y)) + 'px';
                    }
                }
            }
        },
        _focus: function (fieldName, message) {
            if (this._skipFocus) return;
            if (message) {
                for (var i = 0; i < this.get_fields().length; i++) {
                    this._showFieldError(this.get_fields()[i]);
                }
            }
            var cell = this._get_focusedCell();
            if (cell && this.editing() && this._id === _app._activeDataSheetId) {
                if (!isNullOrEmpty(fieldName)) {
                    var field = null;
                    var cellChanged = false;
                    for (i = 0; i < this._fields.length; i++) {
                        field = this._fields[i];
                        if (field.Name === fieldName) {
                            this._focusCell(cell.rowIndex, cell.colIndex, false);
                            cellChanged = cell.colIndex !== i;
                            cell = { rowIndex: this._selectedRowIndex, colIndex: i };
                            if (!this._continueAfterScript)
                                this._saveAndNew = false;
                            break;
                        }
                    }
                    if (!isNullOrEmpty(message) && field) {
                        if (cellChanged) {
                            this._focusCell(cell.rowIndex, cell.colIndex, true);
                            this.refresh(true);
                        }
                        this._showFieldError(field, message);
                    }
                }
                var cellElem = this._focusCell(cell.rowIndex, cell.colIndex, true);
                if (cellElem) {
                    var list = cellElem.getElementsByTagName('input');
                    var canFocus = false;
                    for (i = 0; i < list.length; i++)
                        if (list[i].type !== 'hidden') {
                            canFocus = true;
                            break;
                        }
                    if (!canFocus)
                        list = cellElem.getElementsByTagName('textarea');
                    if (!list.length)
                        list = cellElem.getElementsByTagName('select');
                    if (!list.length)
                        list = cellElem.getElementsByTagName('a');
                    for (i = 0; i < list.length; i++) {
                        var elem = list[i];
                        if (elem.tagName !== 'INPUT' || elem.type !== 'hidden') {
                            if ((elem.tagName === 'INPUT' || elem.tagName === 'TEXTAREA') && this._pendingChars != null) {
                                this._focusText = this._pendingChars;
                                this._focusId = elem.id;
                                var self = this;
                                setTimeout(function () {
                                    self._internalFocus();
                                }, 50);
                            }
                            else
                                Sys.UI.DomElement.setFocus(elem);
                            break;
                        }
                    }
                }
                this._pendingChars = null;
                return;
            }
            if (isNullOrEmpty(fieldName) && !isNullOrEmpty(this._focusedFieldName)) {
                field = this.findField(this._focusedFieldName);
                if (field) fieldName = field.Name;
            }
            this._focusedFieldName = fieldName;
            for (i = 0; i < this.get_fields().length; i++) {
                field = this.get_fields()[i];
                var autoComplete = field.ItemsStyle === 'AutoComplete' && (field.Name === fieldName || field.AliasName === fieldName || isNullOrEmpty(fieldName));
                if (!field.ReadOnly && (fieldName == null || field.Name === fieldName || autoComplete)) {
                    var elemId = this.get_id() + '_Item' + (autoComplete ? field.AliasIndex : field.Index);
                    switch (field.ItemsStyle) {
                        case 'RadioButtonList':
                        case 'CheckBoxList':
                            elemId += '_0';
                            break;
                        case 'Lookup':
                            elemId += '_ShowLookupLink';
                            break;
                    }
                    var element = $get(elemId),
                        elementFocus = $(element).data('focus');
                    var c = $get(String.format('{0}_ItemContainer{1}', this.get_id(), field.Index));
                    var cat = this._categories[field.CategoryIndex];
                    var categoryTabIndex = Array.indexOf(this._tabs, cat.Tab);
                    if (fieldName && categoryTabIndex >= 0) this.set_categoryTabIndex(categoryTabIndex);
                    this._toggleCategoryVisibility(field.CategoryIndex, true);
                    if (element && (!c || Sys.UI.DomElement.getVisible(c) || elementFocus)) {
                        if (fieldName || (categoryTabIndex === this.get_categoryTabIndex() || !this._tabs.length)) {
                            if (categoryTabIndex >= 0) this.set_categoryTabIndex(categoryTabIndex);
                            try {
                                if (message) {
                                    this._showFieldError(field, message);
                                }
                                if (elementFocus)
                                    elementFocus();
                                else
                                    Sys.UI.DomElement.setFocus(element);
                            }
                            catch (ex) {
                                // do nothing
                            }
                            break;
                        }
                    }
                }
            }
        },
        _createFieldInputExtender: function (type, field, input, index) {
            var c = null;
            if (field.Type.startsWith('DateTime')) {
                c = $create(AjaxControlToolkit.CalendarBehavior, { id: String.format('{0}_{1}Calendar{2}_{3}', this.get_id(), type, field.Index, index), button: input.nextSibling }, null, null, input);
                c.set_format(field.DataFormatString.match(/\{0:([\s\S]*?)\}/)[1]);
            }
            else if (field.AllowQBE && field.Type == 'String' && field.AllowAutoComplete != false) {
                c = $create(Web.AutoComplete, {
                    'completionInterval': 500,
                    'contextKey': String.format('{0}:{1},{2}', type, this.get_id(), field.Name),
                    'delimiterCharacters': ';',
                    'id': String.format('{0}_{1}AutoComplete{2}_{3}', this.get_id(), type, field.Index, index),
                    'minimumPrefixLength': field.AutoCompletePrefixLength == 0 ? 1 : field.AutoCompletePrefixLength,
                    'serviceMethod': 'GetListOfValues',
                    'servicePath': this.get_servicePath(),
                    'useContextKey': true,
                    'enableCaching': type != 'SearchBar',
                    'typeCssClass': type
                },
                    null, null, input);
                c._updateClearButton();
            }
            return c;
        },
        showFieldFilter: function (fieldIndex, func, text) {
            if (!this._filterExtenders) this._filterExtenders = [];
            var field = this._allFields[fieldIndex];
            var filter = this.get_fieldFilter(field);
            if (filter) {
                var vm = filter.match(/^([\s\S]*?)(\0|$)/);
                if (vm) filter = vm[1];
            }
            filter = filter && !String.isJavaScriptNull(filter) ? filter.split(_app._listRegex) : [''];
            this._filterFieldIndex = fieldIndex;
            this._filterFieldFunc = func;
            var filterElement = this._filterElement = document.createElement('div');
            filterElement.id = this.get_id() + '$FieldFilter';
            filterElement.className = 'FieldFilter';
            var sb = new Sys.StringBuilder();
            var button = field.Type.startsWith('DateTime') ? '<a class="Calendar" href="javascript:" onclick="return false">&nbsp;</a>' : '';
            sb.appendFormat('<div class="Field"><div class="Label"><span class="Name">{0}</span> <span class="Function">{1}</span></div><div class="Value"><input type="text" value="{2}"/>{3}</div></div>', field.HeaderText, text.toLowerCase(), _app.htmlAttributeEncode(field.format(this.convertStringToFieldValue(field, filter[0]))), button);
            if (func == '$between')
                sb.appendFormat('<div class="Field"><div class="Label"><span class="Function">{0}</span></div><div class="Value"><input type="text" value="{1}"/>{2}</div></div>', resourcesDataFiltersLabels.And, _app.htmlAttributeEncode(filter[1] ? field.format(this.convertStringToFieldValue(field, filter[1])) : ''), button);
            sb.appendFormat('<div class="Buttons"><button onclick="$find(\'{0}\').closeFieldFilter(true);return false">{1}</button><button onclick="$find(\'{0}\').closeFieldFilter(false);return false">{2}</button></div>', this.get_id(), resourcesModalPopup.OkButton, resourcesModalPopup.CancelButton);
            filterElement.innerHTML = sb.toString();
            //document.body.appendChild(this._filterElement);
            this._appendModalPanel(filterElement);
            this._filterPopup = $create(AjaxControlToolkit.ModalPopupBehavior, { 'id': this.get_id() + '$FilterPopup', PopupControlID: filterElement.id, DropShadow: true, BackgroundCssClass: 'ModalBackground' }, null, null, this._container.getElementsByTagName('a')[0]);
            var inputList = filterElement.getElementsByTagName('input');
            for (var i = 0; i < inputList.length; i++) {
                var input = inputList[i];
                var c = this._createFieldInputExtender('Filter', field, input, i);
                if (c) Array.add(this._filterExtenders, c);
            }
            this._saveTabIndexes();
            this._filterPopup.show();
            //inputList[0].focus();
            Sys.UI.DomElement.setFocus(inputList[0]);
            $(filterElement).find('input:text').keydown(function (event) {
                if (event.which == 13) {
                    event.preventDefault();
                    $(filterElement).find('button:first').click();
                }
            });
        },
        closeFieldFilter: function (apply) {
            var inputList = this._filterElement.getElementsByTagName('input');
            var values = [];
            if (apply) {
                var field = this._allFields[this._filterFieldIndex];
                for (var i = 0; i < inputList.length; i++) {
                    var input = inputList[i];
                    if (isBlank(input.value)) {
                        alert(resourcesValidator.RequiredField);
                        Sys.UI.DomElement.setFocus(input);
                        //input.focus();
                        return;
                    }
                    else {
                        this._formatSearchField(input, this._filterFieldIndex);
                        var v = { NewValue: input.value.trim() };
                        var error = this._validateFieldValueFormat(field, v);
                        if (error) {
                            alert(error);
                            Sys.UI.DomElement.setFocus(input);
                            //input.focus();
                            //input.select();
                            return;
                        }
                        else
                            Array.add(values, field.Type.startsWith('DateTime') ? input.value.trim() : v.NewValue);
                    }
                }
            }
            this._disposeFieldFilter();
            this._restoreTabIndexes();
            if (apply)
                this.applyFieldFilter(null, null, values);
        },
        _disposeSearchBarExtenders: function () {
            if (this._searchBarExtenders) {
                for (var i = 0; i < this._searchBarExtenders.length; i++)
                    this._searchBarExtenders[i].dispose();
                Array.clear(this._searchBarExtenders);
            }
        },
        _disposeFieldFilter: function () {
            if (this._filterExtenders) {
                for (var i = 0; i < this._filterExtenders.length; i++)
                    this._filterExtenders[i].dispose();
                Array.clear(this._filterExtenders);
            }
            if (this._filterElement) {
                this._filterPopup.hide();
                this._filterPopup.dispose();
                this._filterPopup = null;
                this._filterElement.parentNode.removeChild(this._filterElement);
                delete this._filterElement;
            }
        },
        _showSearchBarFilter: function (fieldIndex, visibleIndex) {
            this._searchBarVisibleIndex = visibleIndex;
            if (fieldIndex == -1) {
                var elem = this._get('$SearchBarValue$', visibleIndex);
                elem.value = '';
                this._searchBarFuncChanged(visibleIndex);
                this._searchBarVisibleIndex = null;
            }
            else
                this.showCustomFilter(fieldIndex);
        },
        showCustomFilter: function (fieldIndex) {
            var field = this._allFields[fieldIndex];
            var panel = this._customFilterPanel = document.createElement('div');
            //this.get_element().appendChild(panel);
            this._appendModalPanel(panel);
            panel.className = 'CustomFilterDialog';
            panel.id = this.get_id() + '_CustomFilterPanel';
            var sb = new Sys.StringBuilder();
            sb.appendFormat('<div><span class="Highlight">{0}</span> {1}:</div>', _app.htmlEncode(field.Label), resourcesDataFiltersLabels.Includes);
            sb.append('<table cellpadding="0" cellspacing="0">');
            sb.appendFormat('<tr><td colspan="2"><div id="{0}$CustomFilterItemList${1}" class="CustomFilterItems">{2}</div></td></tr>', this.get_id(), fieldIndex, resources.Common.WaitHtml);
            sb.appendFormat('<tr><td></td><td align="right"><button id="{0}Ok">{1}</button> <button id="{0}Cancel">{2}</button></td></tr>', this.get_id(), resourcesModalPopup.OkButton, resourcesModalPopup.CancelButton);
            sb.append('</table>');
            panel.innerHTML = sb.toString();
            sb.clear();
            this._customFilterField = field;
            this._customFilterModalPopupBehavior = $create(AjaxControlToolkit.ModalPopupBehavior, {
                OkControlID: this.get_id() + 'Ok', CancelControlID: this.get_id() + 'Cancel', OnOkScript: String.format('$find("{0}").applyCustomFilter()', this.get_id()), OnCancelScript: String.format('$find("{0}").closeCustomFilter()', this.get_id()),
                PopupControlID: panel.id, DropShadow: true, BackgroundCssClass: 'ModalBackground'
            }, null, null, this._container.getElementsByTagName('a')[0]);
            this._customFilterModalPopupBehavior.show();
            $addHandler(document.body, 'keydown', this._bodyKeydownHandler);
            //var originalField = this.findFieldUnderAlias(field);
            //if (originalField._listOfValues && this._searchBarVisibleIndex == null)
            //    this._onGetFilterListOfValuesComplete(originalField._listOfValues, { 'fieldName': field.Name });
            //else
            //    this._loadFilterListOfValues(field.Name);
            this._loadFilterListOfValues(field.Name);
        },
        _loadFilterListOfValues: function (fieldName) {
            this._busy(true);
            var lc = this.get_lookupContext();
            this._invoke('GetListOfValues', this._createArgsForListOfValues(fieldName), Function.createDelegate(this, this._onGetFilterListOfValuesComplete), { 'fieldName': fieldName });
        },
        _renderFilterOption: function (sb, field, v, index, selected) {
            var item = this._findItemByValue(field, v);
            if (item)
                v = item[1];
            sb.appendFormat('<tr><td class="Input"><input type="checkbox" id="{0}$CustomFilterItem{1}${2}"{4}/></td><td class="Label"><label for="{0}$CustomFilterItem{1}${2}">{3}</label></td></tr>', this.get_id(), field.Index, index, v, selected ? ' checked="checked"' : '');
        },
        _onGetFilterListOfValuesComplete: function (result, context) {
            this._busy(false);
            var field = this.findField(context.fieldName);
            if (result[result.length - 1] == null) {
                Array.insert(result, 0, result[result.length - 1]);
                Array.removeAt(result, result.length - 1);
            }
            var itemsElem = this._get('$CustomFilterItemList$', field.Index);
            if (!itemsElem) return;

            var currentFilter = this._searchBarVisibleIndex != null ? this._createSearchBarFilter(true) : this._filter,
                customFilter = null;
            this.findFieldUnderAlias(field)._listOfValues = result;
            for (var i = 0; i < currentFilter.length; i++) {
                var m = currentFilter[i].match(_app._fieldFilterRegex);
                if (m[1] == field.Name) {
                    customFilter = m[2];
                    break;
                }
            }
            var listOfValues = null,
                func = '$in$';
            if (customFilter) {
                m = customFilter.match(_app._filterRegex);
                if (m) {
                    if (m[1].match(/\$(in|notin|between)\$/)) {
                        func = m[1];
                        listOfValues = m[3].split(_app._listRegex);
                    }
                    else
                        listOfValues = [m[3]];
                    for (i = 0; i < listOfValues.length; i++) {
                        var v = listOfValues[i];
                        if (String.isJavaScriptNull(v))
                            listOfValues[i] = resourcesHeaderFilter.EmptyValue;
                        else {
                            v = this.convertStringToFieldValue(field, v);
                            listOfValues[i] = field.format(v);
                        }
                    }
                }
            }

            var sb = new Sys.StringBuilder();

            sb.appendFormat('<table class="FilterItems" cellpadding="0" cellspacing="0"><tr><td><input type="CheckBox" onclick="$find(\'{0}\')._selectAllFilterItems({1})" id="{0}$CustomFilterItemList$SelectAll"/></td><td><label for="{0}$CustomFilterItemList$SelectAll">{2}</label></td></tr>', this.get_id(), field.Index, resourcesDataFiltersLabels.SelectAll);

            /*for (i = 0; i < result.length; i++) {
            v = result[i];
            if (v == null)
            v = Web.DataViewresourcesHeaderFilter.EmptyValue;
            else {
            v = _app.htmlEncode(field.format(v));
            if (v == '') v = Web.DataViewresourcesHeaderFilter.BlankValue;
            }
            var selected = listOfValues && ((func == '$in$' && Array.contains(listOfValues, v)) || (func == '$notin$' && !Array.contains(listOfValues, v)));
            sb.appendFormat('<tr><td class="Input"><input type="checkbox" id="{0}$CustomFilterItem{1}${2}"{4}/></td><td class="Label"><label for="{0}$CustomFilterItem{1}${2}">{3}</label></td></tr>', this.get_id(), field.Index, i, v, selected ? ' checked="checked"' : '');
            }
            */

            var selectedValues = [],
                selectedStrings = [],
                otherValues = [],
                otherStrings = [],
                originalField = this.findFieldUnderAlias(field)
            for (i = 0; i < result.length; i++) {
                v = result[i];
                var v2 = v;
                if (v == null)
                    v = resourcesHeaderFilter.EmptyValue;
                else {
                    v = _app.htmlEncode(field.format(v));
                    if (v == '') v = resourcesHeaderFilter.BlankValue;
                }
                var selected = listOfValues && ((func == '$in$' && Array.contains(listOfValues, v)) || (func == '$notin$' && !Array.contains(listOfValues, v)));
                if (selected) {
                    Array.add(selectedStrings, v);
                    Array.add(selectedValues, v2);
                }
                else {
                    Array.add(otherStrings, v);
                    Array.add(otherValues, v2);
                }
            }
            for (i = 0; i < selectedStrings.length; i++)
                this._renderFilterOption(sb, field, selectedStrings[i], i, true);
            for (i = 0; i < otherStrings.length; i++)
                this._renderFilterOption(sb, field, otherStrings[i], i + selectedStrings.length, false);

            sb.append('</table>');
            itemsElem.innerHTML = sb.toString();
            //itemsElem.getElementsByTagName('input')[0].focus();
            Sys.UI.DomElement.setFocus(itemsElem.getElementsByTagName('input')[0]);
            if (selectedValues.length > 0) {
                originalField._listOfValues = [];
                Array.addRange(originalField._listOfValues, selectedValues);
                Array.addRange(originalField._listOfValues, otherValues);
            }
        },
        _selectAllFilterItems: function (fieldIndex) {
            var itemsElem = this._get('$CustomFilterItemList$', fieldIndex);
            var list = itemsElem.getElementsByTagName('input');
            for (var i = 1; i < list.length; i++)
                list[i].checked = list[0].checked;
        },
        applyCustomFilter: function () {
            var field = this._customFilterField;
            var searchBarValue = this._searchBarVisibleIndex != null ? this._get('$SearchBarValue$', this._searchBarVisibleIndex) : null;
            var searchBarFunc = searchBarValue ? this._get('$SearchBarFunction$', this._searchBarVisibleIndex) : null;
            this.removeFromFilter(field);
            var filter = null
            var itemsElem = this._get('$CustomFilterItemList$', field.Index);
            var list = itemsElem.getElementsByTagName('input');
            var originalField = this.findFieldUnderAlias(field);
            var numberOfOptions = 0;
            for (var i = 1; i < list.length; i++)
                if (list[i].checked) {
                    if (!filter)
                        filter = '';
                    else
                        filter += '$or$';
                    filter += this.convertFieldValueToString(field, originalField._listOfValues[i - 1]);
                    numberOfOptions++;

                }
            if (filter && (numberOfOptions <= 10 || numberOfOptions != list.length - 1)) {
                if (numberOfOptions <= 10 || numberOfOptions <= (list.length - 1) / 2) {
                    if (searchBarValue)
                        searchBarFunc.value = '$in,true';
                    else
                        Array.add(this._filter, String.format('{0}:$in${1}\0', this._customFilterField.Name, filter));
                }
                else {
                    filter = null;
                    for (i = 1; i < list.length; i++)
                        if (!list[i].checked) {
                            if (!filter)
                                filter = '';
                            else
                                filter += '$or$';
                            filter += this.convertFieldValueToString(field, originalField._listOfValues[i - 1]);
                        }
                    if (searchBarValue)
                        searchBarFunc.value = '$notin,true';
                    else
                        Array.add(this._filter, String.format('{0}:$notin${1}\0', this._customFilterField.Name, filter));
                }
            }
            else
                filter = null;

            for (i = 0; i < this._allFields.length; i++) {
                var f = this._allFields[i];
                if (f != originalField)
                    f._listOfValues = null;
            }
            if (searchBarValue) {
                searchBarValue.value = filter ? filter : '';
                this._searchBarFuncChanged(this._searchBarVisibleIndex);
            }
            //        else {
            //            this.set_pageIndex(-2);
            //            this._loadPage();
            //        }
            else {
                this._forceSync();
                this.refreshData();
            }
            this.closeCustomFilter();
            //this._forgetSelectedRow(true);
        },
        //    applyCustomFilter2: function () {
        //        this.removeFromFilter(this._customFilterField);
        //        var iterator = /\s*(=|<={0,1}|>={0,1}|)\s*([\S\s]+?)\s*(,|;|$)/g;
        //        var filter = this._customFilterField.Name + ':';
        //        var s = $get(this.get_id() + '_Query').value;
        //        var match = iterator.exec(s);
        //        while (match) {
        //            if (!isBlank(match[2]))
        //                filter += (match[1] ? match[1] : (this._customFilterField.Type == 'String' ? '*' : '=')) + match[2] + '\0';
        //            match = iterator.exec(s);
        //        }
        //        if (filter.indexOf('\0') > 0) Array.add(this._filter, filter);
        //        this.set_pageIndex(-2);
        //        this._loadPage();
        //        this.closeCustomFilter();
        //    },
        closeCustomFilter: function () {
            if (this._customFilterModalPopupBehavior) {
                this._customFilterModalPopupBehavior.dispose();
                this._customFilterModalPopupBehavior = null;
                this._customFilterField = null;
            }
            if (this._customFilterPanel) {
                this._customFilterPanel.parentNode.removeChild(this._customFilterPanel);
                delete this._customFilterPanel;
            }
            $removeHandler(document.body, 'keydown', this._bodyKeydownHandler);
            this._customFilterField = null;
            this._searchBarVisibleIndex = null;
        },
        _showUploadProgress: function (index, blobForm) {
            var f = $get(String.format('{0}_Frame{1}', this.get_id(), index));
            var p = $get(String.format('{0}_ProgressBar{1}', this.get_id(), index));
            if (f != null && p != null) {
                var inputFile = $(blobForm).find('input:file');
                var fileName = inputFile.val().split(/(\\|\/)/);
                fileName = fileName.length > 0 ? fileName[fileName.length - 1] : null;
                var inserting = this.inserting();
                var $p = $(p).show().text(fileName).focus();
                var padding = $common.getPaddingBox(p);
                var border = $common.getBorderBox(p);
                p.style.width = (f.offsetWidth - padding.horizontal - border.horizontal) + 'px';
                p.style.height = (f.offsetHeight - padding.vertical - border.vertical) + 'px';
                //Sys.UI.DomElement.setVisible(f, false);
                var $f = $(f).hide();
                if (!inserting) {
                    this._showDownloadProgress();
                    blobForm.submit();
                }
                else {
                    var pendingUploads = this._pendingUploads;
                    if (!pendingUploads)
                        pendingUploads = this._pendingUploads = [];
                    pendingUploads.push({ form: blobForm, progress: p });
                    $p.find('a').button('destroy');
                    $p.addClass('dataview-insert').append(
                        $(String.format('<a>{0}</a>', labelClear)).button({ icons: { primary: "ui-icon-close" }, text: false }).click(function () {
                            $p.hide();
                            $f.show();
                            for (var i = 0; i < pendingUploads.length; i++)
                                if (pendingUploads[i].form == blobForm) {
                                    Array.removeAt(pendingUploads, i);
                                    break;
                                }
                            inputFile.replaceWith(inputFile.clone(true));
                        })
                    );
                }
            }
        },
        _internalRenderActionButtons: function (sb, location, scope, actions) {
            if (!actions)
                actions = this._actionButtonsInScope(scope);
            this._clonedRow = this._cloneChangedRow();

            for (var i = 0; i < actions.length; i++) {
                action = actions[i];
                if (this._isActionAvailable(action)) {
                    var className = !isNullOrEmpty(action.CssClass) ? action.CssClass : '';
                    if (action.HeaderText && action.HeaderText.length > 10) {
                        if (className.length > 0) className += ' ';
                        className += 'AutoWidth';
                    }
                    var disabled = action.CommandName == 'None';
                    sb.appendFormat('<button onclick="{6}$find(\'{0}\').executeAction(\'{5}\', {1},-1);return false" tabindex="{3}" class="{8}{4}"{7}>{2}</button>',
                        this.get_id(), i, action.HeaderText, $nextTabIndex(),
                        className,
                        scope, disabled ? 'return false;' : '', disabled ? ' disabled="disabled"' : '',
                        action.CssClassEx);
                }
                //if (action._whenClientScript != null)
                if (action.WhenClientScript)
                    this._dynamicActionButtons = true;
            }

            this._clonedRow = null;
        },
        _renderActionButtons: function (sb, location, scope) {
            if (this.get_showActionButtons().indexOf(location) == -1) return;
            var actions = this._actionButtonsInScope(scope);
            if (!actions) return;
            var colSpan = this._get_colSpan();
            var actionColumnTd = '';
            if (scope == 'Row' && this._actionColumn) {
                colSpan--;
                actionColumnTd = '<td class="ActionColumn">&nbsp;</td>';
            }
            sb.appendFormat('<tr class="ActionButtonsRow {0}ButtonsRow {2}Scope">{3}<td colspan="{1}" class="ActionButtons {2}ActionButtons">', location, colSpan, scope, actionColumnTd);

            sb.append('<table style="width:100%" cellpadding="0" cellspacing="0" class="ActionButtons"><tr>');

            var actionButtonsId = String.format(' id="{0}$ActionButtons${1}"', this.get_id(), location);

            if (scope == 'Form') {
                var p = this._position;
                var allowNav = p && p.count > 1 && !this.inserting();
                var allowPrevious = p && p.index > 0;
                var allowNext = p && p.index < p.count - 1;
                var printAction = this._get_specialAction('Print');
                var annotateAction = this.get_isModal() ? this._get_specialAction('Annotate') : null;
                sb.appendFormat('<td class="Left"><table class="FormNav"><tr><td class="Previous{5}{7}"><a href="javascript:" onclick="$find(\'{2}\')._advance(-1);return false;" title="{3}"><span></span></a></td><td class="Next{6}{7}"><a href="javascript:" onclick="$find(\'{2}\')._advance(1);return false;" title="{4}"><span></span></a></td><td class="Print{9}"><a href="javascript:" onclick="{10};return false;" title="{8}"><span></span></a></td><td class="Annotate{12}"><a href="javascript:" onclick="{13};return false;" title="{11}"><span></span></a></td><td class="Instruction" id="{0}_Wait" align="left">{1}</td></tr></table></td><td class="Right" align="right"{14}>&nbsp;',
                    location == 'Bottom' ? this.get_id() : '',
                    this.editing() && resources.Form.RequiredFieldMarker ? resources.Form.RequiredFiledMarkerFootnote : '',
                    this.get_id(), resourcesPager.Previous, resourcesPager.Next,
                    allowPrevious ? '' : ' Disabled', allowNext ? '' : ' Disabled', allowNav ? '' : ' Hidden',
                    printAction ? printAction.text : '', printAction ? '' : ' Hidden', printAction ? printAction.script : null,
                    annotateAction ? annotateAction.text : '', annotateAction ? '' : ' Hidden', annotateAction ? annotateAction.script : null,
                    actionButtonsId);
            }
            else
                sb.appendFormat('<td{0}>', actionButtonsId);

            this._internalRenderActionButtons(sb, location, scope, actions);
            this._lastActionButtonsScope = scope;

            sb.append('</td></tr></table>');

            sb.append('</td></tr>');
        },
        _inputListenerKeyPress: function (e) {
            if (e.rawEvent && e.rawEvent.charCode == 0) // Firefox fix
                return;
            if (this._lostFocus) return;

            if (this.editing()) {
                if (this._pendingChars)
                    this._pendingChars += String.fromCharCode(e.charCode);
                return;
            }
            if (this._isBusy) return;
            var fc = this._get_focusedCell();
            if (fc == null) return;
            var field = this._fields[fc.colIndex];
            if (field.ReadOnly) return;
            if (!this._allowEdit()) return;
            this.executeRowCommand(fc.rowIndex, 'Select');
            if (!field.isReadOnly()) {
                this._pendingChars = String.fromCharCode(e.charCode);
                this.editDataSheetRow(fc.rowIndex);
            }
            //        e.stopPropagation();
            //        e.preventDefault();
        },
        _inputListenerKeyDown: function (e) {
            //if (this.editing()) return;
            if (this._lookupIsActive) return;
            if (this._lostFocus) return;
            if (_web.HoverMonitor._instance.get_isOpen()) return;
            if (this._isBusy) {
                if (this._pendingChars)
                    return;
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            if (this._isBusy) return;
            var fc = this._get_focusedCell();
            if (fc == null) return;
            var fc2 = { 'rowIndex': fc.rowIndex, 'colIndex': fc.colIndex };
            var handled = false;
            var causesRender = false;
            var pageSize = this.get_pageSize();
            if (this._rows.length < pageSize)
                pageSize = this._rows.length;
            switch (e.keyCode) {
                case 83: // Ctrl+S
                case Sys.UI.Key.enter:
                    if (e.keyCode == 83 && !e.ctrlKey) return;
                    if (this.editing()) {
                        var tagName = e.target && e.target.tagName;
                        if ((tagName == 'TEXTAREA' || tagName == 'A') && !e.ctrlKey)
                            return;
                        //                    this.executeRowCommand(fc.rowIndex, 'Update', null, true);
                        //                    if (!this._valid)
                        //                        return;
                        handled = true;
                        this._updateFocusedRow(fc)
                        e.preventDefault();
                        e.stopPropagation();
                        return;
                        //                    if (!this._updateFocusedRow(fc)) {
                        //                        e.preventDefault();
                        //                        e.stopPropagation();
                        //                        return;
                        //                    }
                    }
                    if (e.ctrlKey && !this.editing() || this.get_lookupField()) {
                        handled = true;
                        this.executeRowCommand(fc.rowIndex, 'Select');
                    }
                    else if (e.shiftKey) {
                        if (fc2.rowIndex > 0)
                            fc2.rowIndex--;
                    }
                    else {
                        if (this._moveFocusToNextRow(fc2, pageSize))
                            handled = true;
                        //                    if (fc2.rowIndex < pageSize - 1)
                        //                        fc2.rowIndex++;
                    }
                    break;
                case Sys.UI.Key.down:
                    if (this.editing() || e.ctrlKey) return;
                    if (this._moveFocusToNextRow(fc2, pageSize))
                        handled = true;
                    break;
                case Sys.UI.Key.up:
                    if (this.editing() || e.ctrlKey) return;
                    if (fc2.rowIndex > 0)
                        fc2.rowIndex--;
                    else {
                        if (this._pageOffset == 0 && this.get_pageIndex() == 0) {
                            this._pageOffset = null;
                            handled = true;
                        }
                        else if (this._pageOffset == null) {
                            if (this.get_pageIndex() > 0)
                                this._pageOffset = -1;
                        }
                        else
                            this._pageOffset--;
                        handled = true;
                        if (this._pageOffset == -pageSize) {
                            this._pageOffset = null;
                            if (this.get_pageIndex() > 0)
                                this.goToPage(this.get_pageIndex() - 1);
                        }
                        else
                            this.goToPage(this.get_pageIndex());
                    }
                    break;
                case Sys.UI.Key.tab:
                case Sys.UI.Key.right:
                case Sys.UI.Key.left:
                    var allowRefresh = true;
                    if ((e.keyCode == Sys.UI.Key.right || e.keyCode == Sys.UI.Key.left) && this.editing()) return;
                    if (!e.shiftKey && e.target.parentNode.className == 'Date')
                        return;
                    if (e.shiftKey && e.target.id && e.target.id.match(/\$Time\d+/))
                        return;
                    var lastPageOffset = this._pageOffset;
                    if (e.shiftKey || e.keyCode == Sys.UI.Key.left) {
                        if (fc2.colIndex > 0) {
                            fc2.colIndex--;
                            if (e.keyCode == Sys.UI.Key.tab)
                                while (fc2.colIndex > 0 && this._fields[fc2.colIndex].isReadOnly())
                                    fc2.colIndex--;
                        }
                        else if (this.editing())
                            handled = true;
                    }
                    else if (fc2.colIndex < this._fields.length - 1) {
                        fc2.colIndex++;
                        if (e.keyCode == Sys.UI.Key.tab)
                            while (fc2.colIndex < this._fields.length - 1 && this._fields[fc2.colIndex].isReadOnly())
                                fc2.colIndex++;
                    }
                    else {
                        if (this.editing()) {
                            if (!this._updateFocusedRow(fc, e.keyCode == Sys.UI.Key.tab)) {
                                e.preventDefault();
                                e.stopPropagation();
                                return;
                            }
                            else
                                allowRefresh = false;
                            handled = true;
                        }
                        if (allowRefresh && this._moveFocusToNextRow(fc2, pageSize))
                            handled = true;
                        if (fc2.rowIndex != fc.rowIndex || this._pageOffset != lastPageOffset) {
                            fc2.colIndex = 0;
                            handled = false;
                        }
                    }
                    if (allowRefresh && this.editing())
                        causesRender = true;
                    break;
                case Sys.UI.Key.home:
                    if (this.editing()) return;
                    if (e.ctrlKey) {
                        if (this.get_pageIndex() > 0) {
                            handled = true;
                            this._pageOffset = 0;
                            this.goToPage(0);
                            fc.rowIndex = 0;
                            fc.colIndex = 0;
                        }
                        else {
                            fc2.rowIndex = 0;
                            fc2.colIndex = 0;
                        }
                    }
                    else
                        fc2.colIndex = 0;
                    break;
                case Sys.UI.Key.end:
                    if (this.editing()) return;
                    if (e.ctrlKey) {
                        handled = true;
                        fc.colIndex = this._fields.length - 1;
                        fc.rowIndex = this._totalRowCount % this.get_pageSize() - 1;
                        if (fc.rowIndex < 0)
                            fc.rowIndex = this.get_pageSize();
                        this._pageOffset = null;
                        this.goToPage(this.get_pageCount() - 1);
                    }
                    else
                        fc2.colIndex = this._fields.length - 1;
                    break;
                case Sys.UI.Key.pageUp:
                    if (this.editing()) return;
                    handled = true;
                    if (this.get_pageIndex() > 0) {
                        this.goToPage(this.get_pageIndex() - 1);
                    }
                    else if (this._pageOffset != null) {
                        this._pageOffset = null;
                        this.goToPage(this.get_pageIndex());
                    }
                    break;
                case Sys.UI.Key.pageDown:
                    if (this.editing()) return;
                    handled = true;
                    if (this.get_pageIndex() < this.get_pageCount() - 1)
                        this.goToPage(this.get_pageIndex() + 1);
                    break;
                case Sys.UI.Key.esc:
                    if (!this.cancelDataSheetEdit())
                        this.cancelDataSheet();
                    handled = true;
                    break;
                case Sys.UI.Key.del:
                    if (this.editing() || e.shiftKey || e.altKey) return;
                    handled = true;
                    if (e.ctrlKey)
                        this.deleteDataSheetRow();
                    else {
                        this._pendingChars = '';
                        this.editDataSheetRow(fc.rowIndex);
                    }
                    break;
                case 45: /* Insert */
                    if (!this.editing()) {
                        handled = true;
                        if (this._allowNew())
                            this.newDataSheetRow();
                    }
                    break;
                case 32: /* space */
                    if (e.ctrlKey && this.multiSelect() && !this.inserting()) {
                        handled = true;
                        this.toggleSelectedRow(fc.rowIndex);
                    }
                    else
                        return;
                    break;
                case 113: /* F2 */
                    if (this.editing()) return;
                    handled = true;
                    if (this._allowEdit())
                        this.editDataSheetRow(fc.rowIndex);
                    break;
            }
            if ((fc.rowIndex != fc2.rowIndex || fc.colIndex != fc2.colIndex) && !handled) {
                this._focusCell(fc.rowIndex, fc.colIndex, false);
                this._focusCell(fc2.rowIndex, fc2.colIndex, true);
                handled = true;
            }
            if (handled) {
                e.preventDefault();
                e.stopPropagation();
            }
            if (causesRender) {
                if (!this._updateFocusedCell(fc)) {
                    this._focusCell(fc2.rowIndex, fc2.colIndex, false);
                    this._focusCell(fc.rowIndex, fc.colIndex, true);
                }
            }
        },
        _updateFocusedCell: function (fc) {
            var values = this._collectFieldValues();
            var valid = this._validateFieldValues(values, true, fc);
            var field = this._fields[fc.colIndex];
            if (valid) {
                var doRefresh = true;
                if (field.Index < values.length && values[field.Index].Modified)
                    doRefresh = !this._performValueChanged(field.Index);
                if (doRefresh)
                    this.refresh(true);
            }
            else if (field.Behaviors)
                for (var i = 0; i < field.Behaviors.length; i++) {
                    var b = field.Behaviors[i];
                    if (isInstanceOfType(AjaxControlToolkit.CalendarBehavior, b) && b.get_isOpen()) {
                        b.hide();
                        b.show();
                    }
                }
            return valid;
        },
        _updateFocusedRow: function (fc, saveAndNew) {
            _app.showMessage();
            this._syncFocusedCell = this.inserting();
            this._lastFocusedCell = fc;
            this._skipSync = true;
            this.executeRowCommand(fc.rowIndex, this._syncFocusedCell ? 'Insert' : 'Update', null, true);
            if (this._valid)
                this._saveAndNew = saveAndNew;
            return this._valid;
        },
        newDataSheetRow: function () {
            var self = this;
            setTimeout(function () {
                self.executeCommand({ commandName: 'New', commandArgument: self.get_viewId() });
            }, 100);
        },
        editDataSheetRow: function (rowIndex) {
            if (this.get_isDataSheet())
                this.executeRowCommand(rowIndex, 'Edit', '', false);
        },
        deleteDataSheetRow: function () {
            var fc = this._get_focusedCell();
            if (fc) {
                this.executeRowCommand(fc.rowIndex, 'Select');
                var self = this;
                setTimeout(function () {
                    self.executeActionInScope(['Row', 'ActionBar'], 'Delete', null, fc.rowIndex);
                }, 100);
            }
        },
        _moveFocusToNextRow: function (fc2, pageSize) {
            var handled = false;
            var originalDataRowIndex = this._get_selectedDataRowIndex(fc2.rowIndex);
            var originalPageOffset = this._pageOffset;
            if (fc2.rowIndex < pageSize - 1)
                fc2.rowIndex++;
            else if (this._get_selectedDataRowIndex(fc2.rowIndex) < this._totalRowCount - 1) {
                if (this._pageOffset == null)
                    this._pageOffset = 1;
                else
                    this._pageOffset++;
                handled = true;
                if (this._pageOffset == pageSize) {
                    this._pageOffset = null;
                    this.goToPage(this.get_pageIndex() + 1);
                }
                else
                    this.goToPage(this.get_pageIndex());
            }
            if (originalDataRowIndex == this._get_selectedDataRowIndex(fc2.rowIndex) && !this.editing() && this._allowNew()) {
                this._ignoreSelectedKey = true;
                this.newDataSheetRow();
                handled = true;
            }
            return handled;
        },
        _scrollToRow: function (delta) {
            return;
            // not implemented
            //var fc = this._get_focusedCell();
            //if (fc) {
            //    fc.rowIndex += delta > 0 ? 1 : -1;
            //    this._moveFocusToNextRow(fc, this.get_pageSize);
            //}
        },
        _get_selectedDataRowIndex: function (rowIndex) {
            return this.get_pageIndex() * this.get_pageSize() + this.get_pageOffset() + (rowIndex != null ? rowIndex : this._selectedRowIndex);
        },
        set_categoryTabIndex: function (value) {
            if (value != this._categoryTabIndex) {
                this._categoryTabIndex = value;
                if (!_touch) {
                    this._updateTabbedCategoryVisibility();
                    if (value != -1) {
                        if (this._modalPopup) {
                            this._resizeContainerBounds();
                            this._modalPopup.show();
                        }
                        _body_performResize();
                        if (this.editing()) {
                            this._focusedFieldName = null;
                            this._focus();
                        }
                    }
                }
            }
        },
        _resizeContainerBounds: function () {
            if (!this._modalPopup)
                this._container.style.height = '';
            var containerBounds = $common.getBounds(this._container);
            var clientBounds = $common.getClientBounds();
            var maxHeight = Math.ceil(clientBounds.height / 5 * 4);
            if (containerBounds.height > maxHeight) {
                this._container.style.height = maxHeight + 'px';
                containerBounds.skipResizing = true;
            }
            return containerBounds;
        },
        _adjustModalPopupSize: function () {
            var confirmContext = this.get_confirmContext();
            Sys.UI.DomElement.removeCssClass(this._element, 'EmptyModalDialog');
            var sb = new Sys.StringBuilder();
            var rowsToDelete = [];
            var tables = this._container.getElementsByTagName('table');
            for (var i = tables.length - 1; i >= 0; i--) {
                var t = tables[i];
                if (t.className == 'ActionButtons') {
                    if (sb.isEmpty()) {
                        sb.append('<table class="DataView" cellSpacing=0 cellPadding=0><tr class="ActionButtonsRow BottomButtonsRow">')
                        sb.append(t.parentNode.parentNode.innerHTML);
                        sb.append('</tr></table>');
                    }
                    Array.add(rowsToDelete, t.parentNode.parentNode);
                }
            }
            while (rowsToDelete.length > 0) {
                rowsToDelete[0].parentNode.removeChild(rowsToDelete[0]);
                delete rowsToDelete[0];
                Array.removeAt(rowsToDelete, 0);
            }
            var contentElem = this._container.childNodes[0];
            contentElem.style.width = '';
            contentElem.style.height = '';
            var contentSize = $common.getContentSize(contentElem);
            contentSize.height += sysBrowser.agent === sysBrowser.InternetExplorer && sysBrowser.version < 8 ? 3 : 1;
            if (!this._buttons) {
                this._buttons = document.createElement('div');
                this.get_element().appendChild(this._buttons);
                this._buttons.style.width = contentSize.width + 'px';
                Sys.UI.DomElement.addCssClass(this._buttons, 'FixedButtons');
                this._title = document.createElement('div');
                //this._title.innerHTML = _app.htmlEncode(this.get_view().Label);
                Sys.UI.DomElement.addCssClass(this._title, 'FixedTitle');
                this.get_element().insertBefore(this._title, this._container);
                if (!__designer())
                    $(this._element).draggable({
                        'handle': this._title, drag: function (event, ui) {
                            var w = $window;
                            var clientWidth = w.width();
                            var clientHeight = w.height();
                            var left = ui.offset.left - w.scrollLeft();
                            var top = ui.offset.top - w.scrollTop();
                            var width = ui.helper.outerWidth();
                            if (left + width < 50 || top < 5 || left > clientWidth - 50 || top > clientHeight - 75)
                                return false;
                        }
                    });
            }
            else {
                if (!this._modalAutoSized) {
                    //this._buttons.style.width = 'auto';
                    //this._title.style.width = 'auto';
                    this._container.style.width = 'auto';
                    this._modalAutoSized = true;
                }
            }
            this._buttons.innerHTML = sb.toString();
            sb.clear();
            //        var containerBounds = $common.getBounds(this._container);
            //        var clientBounds = $common.getClientBounds();
            //        var maxHeight = Math.ceil(clientBounds.height / 5 * 4);
            //        if (containerBounds.height > maxHeight)
            //            this._container.style.height = maxHeight + 'px';
            var containerBounds = this._resizeContainerBounds();
            if (containerBounds.height > contentSize.height && !containerBounds.skipResizing) {
                var cbb = $common.getBorderBox(contentElem);
                contentSize.width += cbb.horizontal;
                $common.setContentSize(this._container, contentSize);
            }
            contentElem.style.width = this._title.offsetWidth + 'px';
            this._buttons.style.width = this._title.offsetWidth + 'px';
            Sys.UI.DomElement.setVisible(this.get_element(), true);
            //        if (this._modalPopup) {
            //            if (sysBrowser.agent === sysBrowser.InternetExplorer) this._modalPopup.hide();
            //            this._modalPopup.show();
            //        }
            var b = $common.getBounds(this._container);
            var tb = $common.getPaddingBox(this._title);
            var bb = $common.getBorderBox(this._title);
            this._title.style.width = (b.width - tb.horizontal - bb.horizontal) + 'px';
            tb = $common.getPaddingBox(this._buttons);
            bb = $common.getBorderBox(this._buttons);
            this._buttons.style.width = (b.width - tb.horizontal - bb.horizontal) + 'px';
            this._title.innerHTML = String.format('<table style="width:100%" cellpadding="0" cellspacing="0"><tr><td><div class="Text">{1}</div></td><td align="right"><a href="javascript:" class="Close" onclick="$find(\'{0}\').endModalState(\'Cancel\');return false" tabindex="{3}" title="{2}">&nbsp;</a></td></tr></table>',
                this.get_id(),
                confirmContext && confirmContext.WindowTitle ? confirmContext.WindowTitle : _app.htmlEncode(this.get_view().Label),
                resourcesModalPopup.Close,
                $nextTabIndex());
            //if (sysBrowser.agent === sysBrowser.InternetExplorer && this.editing()) this._focus();
            this._modalPopup.show();
            if (this._modalAutoSized && !this._modalWidthFixed) {
                this._modalWidthFixed = true;
                this._container.style.width = this._container.offsetWidth + 'px';
            }
            this._adjustModalHeight(true);
        },
        _adjustModalHeight: function (save) {
            var container = this._container;
            if (this._modalPopup && this.get_viewType() == 'Form')
                if (save) {
                    //var containerBounds = $common.getBounds(container);
                    //this._lastContainerHeight = containerBounds.height;
                    this._lastContainerHeight = $(container).height();
                }
                else if (this._lastContainerHeight != null) {
                    var oldStyleHeight = container.style.height;
                    var oldScrollTop = container.scrollTop;
                    container.style.height = '';
                    var categoriesCell = null;
                    var trList = container.getElementsByTagName('tr');
                    for (var i = 0; i < trList.length; i++) {
                        if (trList[i].className == 'Categories') {
                            categoriesCell = trList[i].childNodes[0];
                            break;
                        }
                    }
                    if (categoriesCell)
                        categoriesCell.style.paddingBottom = '';
                    containerBounds = $common.getBounds(container);
                    if (this._lastContainerHeight > containerBounds.height) {
                        if (categoriesCell) {
                            var paddingBox = $common.getPaddingBox(categoriesCell);
                            var newPaddingBottom = this._lastContainerHeight - containerBounds.height - paddingBox.bottom;
                            if (sysBrowser.agent == sysBrowser.InternetExplorer)
                                newPaddingBottom++;
                            categoriesCell.style.paddingBottom = newPaddingBottom + 'px';
                        }
                    }
                    else {
                        var clientBounds = $common.getClientBounds();
                        if (clientBounds.height * 0.8 <= containerBounds.height) {
                            container.style.height = oldStyleHeight;
                            container.scrollTop = oldScrollTop;
                        }
                        else
                            this._lastContainerHeight = containerBounds.height;
                    }
                }
        },
        _disposeModalPopup: function () {
            if (!this._modalPopup) return;
            this._modalPopup.hide();
            this._modalPopup.dispose();
            //delete this._modalPopup._backgroundElement;
            //delete this._modalPopup._foregroundElement;
            //delete this._modalPopup._popupElement;
            if (!__designer())
                $(this._element).draggable('destroy');
            delete this._buttons;
            delete this._title;
            delete this._modalAnchor;
            var elem = this.get_element();
            elem.parentNode.removeChild(elem);
            this._restoreTabIndexes();
        },
        _adjustLookupSize: function () {
            //if (this.get_lookupField() && _app.isIE6) this.get_lookupField()._lookupModalBehavior._layout();
            if (this.get_lookupField() && this.get_pageSize() > 3) {
                var scrolling = _app.scrolling(); // $common.getScrolling();
                var clientBounds = $common.getClientBounds()
                var b = $common.getBounds(this.get_element());
                if (b.height + b.y > clientBounds.height + scrolling.y)
                    this.set_pageSize(Math.ceil(this.get_pageSize() * 0.66));
            }
        },
        _get_LEVs: function () {
            for (var i = 0; i < _app.LEVs.length; i++) {
                var lev = _app.LEVs[i];
                if (lev.controller == this.get_controller())
                    return lev.records;
            }
            lev = { 'controller': this.get_controller(), 'records': [] };
            Array.add(_app.LEVs, lev);
            return lev.records;
        },
        _recordLEVs: function (values) {
            if (!this._allowLEVs || !values && !this._lastArgs.CommandName.match(/Insert|Update/)) return;
            if (!(this._lastArgs || values)) return;
            if (!values) values = this._lastArgs.Values;
            var levs = this._get_LEVs();
            var skip = true;
            for (var i = 0; i < values.length; i++) {
                if (values[i].Modified) {
                    skip = false;
                    break;
                }
            }
            if (skip) return;
            if (levs.length > 0)
                Array.removeAt(levs, levs.length - 1);
            Array.insert(levs, 0, values)
        },
        _applyLEV: function (fieldIndex) {
            var f = this._allFields[fieldIndex];
            var f2 = this._allFields[f.AliasIndex];
            var values = [];
            var r = this._get_LEVs()[0];
            for (var i = 0; i < r.length; i++) {
                var v = r[i];
                if (v.Name == f.Name || v.Name == f2.Name)
                    Array.add(values, { 'name': v.Name, 'value': v.NewValue });
            }
            this.refresh(true, values);
        },
        _useLEVs: function (row) {
            if (row && this._allowLEVs) {
                var r = this._get_LEVs();
                if (r.length > 0) {
                    for (i = 0; i < r[0].length; i++) {
                        var v = r[0][i];
                        f = this.findField(v.Name);
                        if (f && f.AllowLEV) {
                            if (this._lastCommandName === 'New' && v.Modified && v.NewValue != null) {
                                var copy = true;
                                for (var k = 0; k < this._externalFilter.length; k++) {
                                    if (this._externalFilter[k].Name.toLowerCase() === v.Name.toLowerCase()) {
                                        copy = false;
                                        break;
                                    }
                                }
                                if (copy)
                                    row[f.Index] = v.NewValue;
                            }
                            f._LEV = v.Modified ? v.NewValue : null;
                        }
                    }
                }
            }
        },
        _bodyKeydown: function (e) {
            var preventDefault = false;
            if (this._customFilterField) {
                if (e.keyCode == Sys.UI.Key.enter) {
                    preventDefault = true;
                    this.applyCustomFilter();
                }
                else if (e.keyCode == Sys.UI.Key.esc) {
                    preventDefault = true;
                    this.closeCustomFilter();
                }
            }
            else if (this.get_lookupField())
                if (e.keyCode == Sys.UI.Key.esc) {
                    preventDefault = true;
                    this.hideLookup();
                }
            if (preventDefault) {
                e.preventDefault();
                e.stopPropagation();
            }
        },
        _refreshActionButtons: function () {
            var topActionButtons = this._get('$ActionButtons$', 'Top');
            if (topActionButtons && this._newTopActionButtons) {
                topActionButtons.innerHTML = this._newTopActionButtons;
                this._newTopActionButtons = null;
            }
            var bottomActionButtons = this._get('$ActionButtons$', 'Bottom');
            if (bottomActionButtons && this._newBottomActionButtons) {
                bottomActionButtons.innerHTML = this._newBottomActionButtons;
                this._newBottomActionButtons = null;
            }
        },
        _quickFind_focus: function (e) {
            var qf = this.get_quickFindElement();
            if (qf.value == resourcesGrid.QuickFindText)
                qf.value = '';
            Sys.UI.DomElement.removeCssClass(qf, 'Empty');
            Sys.UI.DomElement.removeCssClass(qf, 'NonEmpty');
            qf.select();
            this._lostFocus = true;
        },
        _quickFind_blur: function (e) {
            var qf = this.get_quickFindElement();
            if (isBlank(qf.value)) {
                qf.value = resourcesGrid.QuickFindText;
                Sys.UI.DomElement.addCssClass(qf, 'Empty');
            }
            else
                Sys.UI.DomElement.addCssClass(qf, 'NonEmpty');
            this._lostFocus = false;
        },
        showLookup: function (fieldIndex) {
            if (!this.get_enabled()) return;
            var field = this._allFields[fieldIndex];
            if (!field._lookupModalBehavior) {
                var showLink = $get(this.get_id() + '_Item' + field.Index + '_ShowLookupLink');
                if (showLink) {
                    var panel = field._lookupModalPanel = document.createElement('div');
                    //document.body.appendChild(panel);
                    this._appendModalPanel(panel);
                    panel.className = 'ModalPanel';
                    panel.id = this.get_id() + '_ItemLookupPanel' + field.Index;
                    panel.innerHTML = String.format('<table style="width:100%;height:100%"><tr><td valign="middle" align="center"><table cellpadding="0" cellspacing="0"><tr><td class="ModalTop"><div style="height:1px;font-size:1px"></div></td><td><div style="height:1px;font-size:1px"></div></td></tr><tr><td align="left" valign="top" id="{0}_ItemLookupPlaceholder{1}"  class="ModalPlaceholder"></td><td class="RightSideShadow"></td></tr><tr><td colspan="2"><div class="BottomShadow"></div></td></tr></table></td></tr></table>', this.get_id(), field.Index);
                    field._lookupModalBehavior = $create(AjaxControlToolkit.ModalPopupBehavior, { id: this.get_id() + "_ItemLookup" + field.Index, PopupControlID: panel.id, BackgroundCssClass: 'ModalBackground' }, null, null, showLink);
                }
            }
            else
                field._lookupDataControllerBehavior._render();
            var contextFilter = this.get_contextFilter(field);
            var focusQF = true;
            if (!field._lookupDataControllerBehavior) {
                focusQF = false;
                field._lookupDataControllerBehavior = $create(Web.DataView, {
                    id: this.get_id() + '_LookupView' + fieldIndex, baseUrl: this.get_baseUrl(), pageSize: field.ItemsPageSize ? field.ItemsPageSize : resourcesPager.PageSizes[0], showFirstLetters: field.ItemsLetters, servicePath: this.get_servicePath(),
                    controller: field.ItemsDataController, viewId: field.ItemsDataView, showActionBar: resources.Lookup.ShowActionBar, lookupField: field, externalFilter: contextFilter, filterSource: contextFilter.length > 0 ? 'Context' : null, 'showSearchBar': this.get_showSearchBar(), 'searchOnStart': this.get_showSearchBar() && field.SearchOnStart, 'description': field.ItemsDescription
                }, null, null, $get(this.get_id() + '_ItemLookupPlaceholder' + field.Index));
            }
            else if (contextFilter.length > 0) {
                field._lookupDataControllerBehavior.set_externalFilter(contextFilter);
                field._lookupDataControllerBehavior.goToPage(-1);
                focusQF = true;
            }
            this._saveTabIndexes();
            field._lookupModalBehavior.show();
            if (focusQF) field._lookupDataControllerBehavior._focusQuickFind(true);
            $addHandler(document.body, 'keydown', field._lookupDataControllerBehavior._bodyKeydownHandler);
            field._lookupDataControllerBehavior._adjustLookupSize();
            this._lookupIsActive = true;
        },
        changeLookupValue: function (fieldIndex, value, text) {
            var field = this._allFields[fieldIndex],
                that = this;
            that._focusedFieldName = field.Name;
            setTimeout(function () {
                that._restoreTabIndexes();
                var itemId = that.get_id() + '_Item' + fieldIndex;
                var itemTextId = that.get_id() + '_Item' + field.AliasIndex;
                Sys.UI.DomElement.setVisible($get(itemId + '_ClearLookupLink'), true);
                var elem = $get(itemId + '_ShowLookupLink');
                elem.innerHTML = that.htmlEncode(field, text);
                Sys.UI.DomElement.setFocus(elem);
                //$get(itemId + '_ShowLookupLink').focus();
                if (value)
                    value = field.format(value);
                $get(itemId).value = value;
                if (itemId != itemTextId) $get(itemTextId).value = text;
                $(elem).closest('table').css('width', '');
                //while (elem.tagName != 'TABLE') elem = elem.parentNode;
                //elem.style.width = '';
                that._updateLookupInfo(value, text);
                that._valueChanged(fieldIndex);
                that._adjustModalHeight();
            }, 0);
            that._closeLookup(field);
        },
        clearLookupValue: function (fieldIndex) {
            var field = this._allFields[fieldIndex];
            var itemId = this.get_id() + '_Item' + fieldIndex;
            var itemTextId = this.get_id() + '_Item' + field.AliasIndex;
            Sys.UI.DomElement.setVisible($get(itemId + '_ClearLookupLink'), false);
            $get(itemId + '_ShowLookupLink').innerHTML = resources.Lookup.SelectLink;
            $get(itemId).value = '';
            $get(itemTextId).value = '';
            if (!isNullOrEmpty(field.Copy)) {
                var values = [];
                var iterator = /(\w+)=(\w+)/g;
                var m = iterator.exec(field.Copy);
                while (m) {
                    if (m[2] == 'null')
                        Array.add(values, { 'name': m[1], 'value': null });
                    m = iterator.exec(field.Copy);
                }
                if (values.length > 0)
                    this.refresh(true, values);
            }

            this._updateLookupInfo('', resources.Lookup.SelectLink);
            $get(itemId + '_ShowLookupLink').focus();
            this._valueChanged(fieldIndex);
            this._adjustModalHeight();
        },
        _updateLookupInfo: function (value, text) {
            var lookupText = $get(this.get_id() + '_Text0');
            if (lookupText) {
                lookupText.value = text;
                lookupText.name = lookupText.id;
                var lookupValue = $get(this.get_id() + '_Item0');
                lookupValue.value = value;
                lookupValue.name = lookupValue.id;
                if (this.get_lookupPostBackExpression()) {
                    var prm = Sys.WebForms.PageRequestManager.getInstance();
                    if (prm)
                        eval("Sys.WebForms.PageRequestManager.getInstance()._doPostBack" + this.get_lookupPostBackExpression().match(/\w+(.+)/)[1]);
                    else
                        eval(this.get_lookupPostBackExpression());
                }
            }
        },
        createNewLookupValue: function (fieldIndex) {
            var field = this._newLookupValueField = this._allFields[fieldIndex];
            var cnv = this._createNewView = _app.showModal(/*$get(String.format('{0}_Item{1}_CreateNewLookupLink', this.get_id(), field.Index))*/this, field.ItemsDataController, field.ItemsNewDataView, 'New', field.ItemsNewDataView, this.get_baseUrl(), this.get_servicePath(), this.get_contextFilter(field));
            cnv._parentDataViewId = this.get_id();
            cnv.add_executed(Function.createDelegate(this, this._saveNewLookupValueCompleted));
            cnv.set_showSearchBar(this.get_showSearchBar());
            this._lookupIsActive = true;
        },
        _saveNewLookupValueCompleted: function (sender, args) {
            if (args.result.Errors.length > 0) return;
            args.handled = true;
            _app.hideMessage();
            var v = null;
            var newLookupValueField = this._newLookupValueField;
            var lookupDataValueField = newLookupValueField.ItemsDataValueField;
            if (isNullOrEmpty(lookupDataValueField))
                lookupDataValueField = sender._keyFields[0].Name;
            if (args.result.Values.length == 0) args.result.Values = sender._lastArgs.Values;
            for (var j = 0; j < args.result.Values.length; j++)
                if (args.result.Values[j].Name == lookupDataValueField) {
                    v = args.result.Values[j].NewValue;
                    break;
                }
            var t = null;
            var lookupDataTextField = newLookupValueField.ItemsDataTextField;
            if (isNullOrEmpty(lookupDataTextField))
                lookupDataTextField = sender._fields[0].Name;
            for (i = 0; i < sender._lastArgs.Values.length; i++) {
                if (sender._lastArgs.Values[i].Name == lookupDataTextField) {
                    t = sender._lastArgs.Values[i].NewValue;
                    break;
                }
            }
            this._createNewView.endModalState('Cancel');
            this._copyLookupValues(null, newLookupValueField, sender._lastArgs.Values);
            this.changeLookupValue(newLookupValueField.Index, v, t);
            this._lookupIsActive = false;
        },
        hideLookup: function (fieldIndex) {
            var field = fieldIndex ? this._allFields[fieldIndex] : this.get_lookupField();
            var dv = this.get_lookupField()._dataView;
            dv._closeLookup(field);
            dv._restoreTabIndexes();
            $get(dv.get_id() + '_Item' + field.Index + '_ShowLookupLink').focus();
        },
        closeLookupAndCreateNew: function () {
            this.hideLookup();
            var field = this.get_lookupField();
            field._dataView.createNewLookupValue(field.Index);
        },
        _valueChanged: function (index) {
            var field = this._allFields[index];
            this._showFieldError(field, null);
            this._skipErrorReset = false;
            var self = this;
            self._valueChangedTimeout = setTimeout(function () {
                if (!_app._navigated)
                    self._performValueChanged(index, true);
            }, 200);
        },
        _performValueChanged: function (index, processReadOnly) {
            var field = this._allFields[index];
            if (!field) return;
            if (this._skipErrorReset) {
                this._skipErrorReset = false;
                return;
            }
            else
                this._showFieldError(field, null);
            this._replaceFieldValue(field);
            var r3 = this._resetContextLookupValues(field);
            var r1 = this._copyStaticLookupValues(field);
            this._updateVisibility();
            var r2 = this._updateDynamicValues(field);
            if (processReadOnly && this._readOnlyChanged && this.editing()) {
                this.refresh(true);
                this._focus();
            }
            return r1 || r2 || r3 || this._readOnlyChanged;
        },
        _updateVisibility: function (row) {
            if (!this._expressions) return;
            this._readOnlyChanged = false;
            var isForm = this.get_isForm();
            var expressions = [];
            if (!row)
                row = this._cloneChangedRow();
            if (!row) return;
            var changed = false;
            var checkTabs = false;
            for (var i = 0; i < this._expressions.length; i++) {
                var exp = expressions[0] = this._expressions[i];
                if (exp.Type == Web.DynamicExpressionType.ClientScript)
                    if (exp.Scope == Web.DynamicExpressionScope.DataFieldVisibility) {
                        var f = this.findField(exp.Target);
                        if (f) {
                            var elem = this._get(isForm ? '_ItemContainer' : 'Item', f.Index);
                            if (elem) {
                                var result = this._evaluateJavaScriptExpressions(expressions, row, false);
                                if (isForm) {
                                    var isVisible = Sys.UI.DomElement.getVisible(elem);
                                    if (Sys.UI.DomElement.containsCssClass(elem.parentNode, 'FieldPlaceholder')) elem = elem.parentNode;
                                    else if (Sys.UI.DomElement.containsCssClass(elem.parentNode.parentNode, 'FieldWrapper')) elem = elem.parentNode.parentNode.parentNode.parentNode;
                                    Sys.UI.DomElement.setVisible(elem, result == true);
                                    if (isVisible != result) changed = true;
                                }
                            }
                        }
                    }
                    else if (exp.Scope == Web.DynamicExpressionScope.CategoryVisibility) {
                        var c = this.findCategory(exp.Target);
                        if (c) {
                            elem = this._get('_Category', c.Index);
                            if (elem) {
                                c.IsVisible = this._evaluateJavaScriptExpressions(expressions, row, false);
                                result = c.IsVisible && (isNullOrEmpty(c.Tab) || c.Tab == this._get_selectedTab());
                                isVisible = Sys.UI.DomElement.getVisible(elem);
                                Sys.UI.DomElement.setVisible(elem, result == true);

                                if (isVisible != result) changed = true;
                                var catDescriptionCell = this._get('$CategoryDescription$', c.Index);
                                if (catDescriptionCell) {
                                    var descriptionText = this._processTemplatedText(row, c.Description);
                                    catDescriptionCell.innerHTML = descriptionText;
                                    catDescriptionCell.style.display = isNullOrEmpty(descriptionText) ? 'none' : 'block';
                                }
                                if (!isNullOrEmpty(c.Tab))
                                    checkTabs = true;
                            }
                        }
                    }
                    else if (exp.Scope == Web.DynamicExpressionScope.ReadOnly) {
                        f = this.findField(exp.Target);
                        if (f) {
                            if (f.OriginalTextMode == null)
                                f.OriginalTextMode = f.TextMode;
                            var isReadOnly = f.isReadOnly();
                            result = this._evaluateJavaScriptExpressions(expressions, row, false);
                            f.TextMode = result == true ? 4 : f.OriginalTextMode;
                            if (result != isReadOnly) {
                                changed = true;
                                this._readOnlyChanged = true;
                            }
                        }
                    }
            }
            if (checkTabs)
                for (i = 0; i < this._tabs.length; i++) {
                    var tab = this._tabs[i];
                    var dynamicVisibility = false;
                    var tabIsVisible = false;
                    for (var j = 0; j < this._categories.length; j++) {
                        c = this._categories[j];
                        if (c.Tab == tab && c.IsVisible != null) {
                            dynamicVisibility = true;
                            tabIsVisible = c.IsVisible;
                            if (tabIsVisible)
                                break;
                        }
                    }
                    if (dynamicVisibility)
                        Sys.UI.DomElement.setVisible(this._get('_Tab', i), tabIsVisible);
                }
            if (this._dynamicActionButtons) {
                this._clonedRow = row;
                var topActionButtons = this._get('$ActionButtons$', 'Top');
                if (topActionButtons) {
                    var sb = new Sys.StringBuilder();
                    this._internalRenderActionButtons(sb, 'Top', this._lastActionButtonsScope);
                    this._newTopActionButtons = sb.toString();
                    sb.clear();
                }
                var bottomActionButtons = this._get('$ActionButtons$', 'Bottom');
                if (bottomActionButtons) {
                    sb = new Sys.StringBuilder();
                    this._internalRenderActionButtons(sb, 'Bottom', this._lastActionButtonsScope);
                    this._newBottomActionButtons = sb.toString();
                    sb.clear();
                }
                var self = this;
                setTimeout(function () {
                    self._refreshActionButtons();
                }, 500);
                this._clonedRow = null;
            }
            this._updateStatusBar();
            if (changed) {
                this._adjustModalHeight();
                if (this._modalPopup)
                    this._modalPopup.show();
                _body_performResize();
            }
            if (this.editing() && !this._lookupIsActive) {
                var cell = this._get_focusedCell();
                for (i = 0; i < this._fields.length; i++) {
                    f = this._fields[i];
                    if (!f.ReadOnly && !f.Hidden && f.AutoSelect && f.ItemsStyle == 'Lookup' && (cell == null || cell.colIndex == f.ColIndex)) {
                        f.AutoSelect = false;
                        v = row[f.Index];
                        if (v == null) {
                            this._lookupIsActive = true;
                            self = this;
                            setTimeout(function () {
                                self.showLookup(f.Index);
                            }, 100);
                            break;
                        }
                    }
                }
            }
        },
        cancelDataSheet: function () {
            if (this.get_isDataSheet()) {
                this._focusCell(-1, -1, false);
                this._stopInputListener();
                this.set_ditto(null);
                _app._activeDataSheetId = null;
                this.cancelDataSheetEdit();
                this._lostFocus = false;
                this._focusedCell = null;
            }
        },
        initialize: function () {
            _app.callBaseMethod(this, 'initialize');
            this._filterSourceSelectedHandler = Function.createDelegate(this, this._filterSourceSelected);
            this._bodyKeydownHandler = Function.createDelegate(this, this._bodyKeydown);
            this._quickFindHandlers = {
                'focus': this._quickFind_focus,
                'blur': this._quickFind_blur,
                'keydown': this._quickFind_keydown
            }
            this._checkMaxLengthHandler = function (e) {
                var maxLen = parseInteger(this.getAttribute('maxlength'));
                if (this.value.length > maxLen) {
                    this.value = this.value.substr(0, maxLen);
                    e.preventDefault();
                    e.stopPropagation();
                }
            };
        },
        _updateLayoutContainerVisibility: function (visible) {
            var that = this;
            //if (_touch) {
            //    that._hidden = !visible;
            //    if (visible && that._hiddenEcho) {
            //        that._hiddenEcho = false;
            //        $('.app-echo[data-for="' + that._id + '"]').show();
            //    }
            //    return;
            //}
            if (that._forceVisible) visible = true;
            var c = that._element.parentNode;
            if (isNullOrEmpty(c.getAttribute('data-visibility-controller')))
                c.setAttribute('data-visibility-controller', that.get_id());
            var activator = !isNullOrEmpty(that.dataAttr(c, 'activator')) ? that.dataAttr(c, 'activator').match(/^\s*(\w+)\s*\|\s*(.+?)\s*(\|\s*(.+)\s*)?$/) : null;
            if (that.get_autoHide() == Web.AutoHideMode.Self) {
                that._element.style.display = visible ? '' : 'none';
                if (!visible)
                    visible = $(that._element).siblings().is(':visible');
                var tabBar = c.parentNode.childNodes[0];
                while (tabBar.tagName != 'DIV')
                    tabBar = tabBar.nextSibling;
                if (activator && activator[1] == 'Tab' && Sys.UI.DomElement.containsCssClass(tabBar, 'TabBar')) {
                    if (c.getAttribute('data-visibility-controller') == that.get_id()) {
                        var tabIndex = -1;
                        for (var i = 0; i < c.parentNode.childNodes.length; i++) {
                            var n = c.parentNode.childNodes[i];
                            if (n.className && Sys.UI.DomElement.containsCssClass(n, 'TabBody')) tabIndex++;
                            if (c == n) break;

                        }
                        if (tabIndex != -1) {
                            var menuCells = tabBar.getElementsByTagName('td');
                            var menuCell = menuCells[tabIndex];
                            menuCell.style.display = visible ? '' : 'none';
                            if (!visible && Sys.UI.DomElement.containsCssClass(menuCell, 'Selected')) {
                                var links = tabBar.getElementsByTagName('a');
                                for (i = 0; i < menuCells.length; i++) {
                                    if ($common.getVisible(menuCells[i])) {
                                        $find(c.parentNode.id + '$ActivatorMenu').select(i, links[i]);
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }
                else
                    that.dataAttr(c, 'hidden', !visible);
            }
            else {
                if (activator && activator[1] == 'SideBarTask')
                    that.dataAttr(c, 'hidden', true);
                while (c) {
                    if (!isNullOrEmpty(that.dataAttr(c, 'flow'))) {
                        c.style.display = visible ? '' : 'none';
                        break;
                    }
                    c = c.parentNode;
                }
            }
            var sideBar = $get('PageContentSideBar');
            if (sideBar && activator) {
                var tasks = sideBar.getElementsByTagName('a');
                for (i = 0; i < tasks.length; i++) {
                    var l = tasks[i];
                    if (Sys.UI.DomElement.containsCssClass(l.parentNode, 'Task') && l.innerHTML == activator[2]) {
                        l.parentNode.style.display = visible ? '' : 'none';
                        break;
                    }
                }
            }
            if (_app._loaded)
                _body_resize();
        },
        loadPage: function (showWait) {
            var displayed = this.get_isDisplayed();
            this._showWait(!displayed);
            if (this.get_mode() != Web.DataViewMode.View || (this.get_lookupField() || !(this._delayedLoading = !displayed))) {
                if (!this._source)
                    this._loadPage();
            }
            else if (!Array.contains(_app._delayedLoadingViews, this)) {
                Array.add(_app._delayedLoadingViews, this);
                _app._startDelayedLoading();
            }
        },
        _saveTabIndexes: function () {
            this._lastSavedTabIndexes = this._savedTabIndexes;
            this._savedTabIndexes = [];
            for (var i = 0; i < _app._tagsWithIndexes.length; i++) {
                var tags = document.getElementsByTagName(_app._tagsWithIndexes[i]);
                for (var j = 0; j < tags.length; j++) {
                    var elem = tags[j];
                    if (elem)
                        Array.add(this._savedTabIndexes, { element: elem, tabIndex: elem.tabIndex });
                }
            }
        },
        _restoreTabIndexes: function () {
            if (this._savedTabIndexes) {
                for (var i = 0; i < this._savedTabIndexes.length; i++) {
                    this._savedTabIndexes[i].element.tabIndex = this._savedTabIndexes[i].tabIndex;
                    delete this._savedTabIndexes[i].element;
                }
                Array.clear(this._savedTabIndexes);
            }
            this._savedTabIndexes = this._lastSavedTabIndexes;
            this._lastSavedTabIndexes = null;
        },
        _showImport: function (view) {
            if (!view) view = this.get_viewId();
            this._importView = view;
            this._importElement = document.createElement('div');
            this._importElement.id = this.get_id() + '$Import';
            this._importElement.className = 'Import';
            var sb = new Sys.StringBuilder();
            var s = '';//String.format('<a href="javascript:" onclick="$find(\'{0}\')._downloadImportTemplate(\'{1}\');return false;">{2}</a>', this.get_id(), view, resourcesData.Import.DownloadTemplate);
            sb.appendFormat('<div id="{0}$ImportStatus" class="Status"><span>{1}</span> {2}</div>', this.get_id(), resourcesData.Import.UploadInstruction, s);
            sb.appendFormat('<div id="{0}$ImportMap" class="Map" style="display:none"></div>', this.get_id());
            sb.appendFormat('<iframe src="{1}?parentId={0}&controller={2}&view={3}" frameborder="0" scrolling="no" id="{0}$ImportFrame" class="Import"></iframe>', this.get_id(), this.resolveClientUrl(this.get_appRootPath() + 'Import.ashx'), this.get_controller(), view);
            sb.appendFormat('<div class="Email">{1}:<br/><input type="text" id="{0}$ImportEmail"/></div>', this.get_id(), resourcesData.Import.Email);
            sb.appendFormat('<div class="Buttons"><button id="{0}$StartImport" onclick="$find(\'{0}\')._startImportProcessing();return false" style="display:none">{1}</button><button id="{0}$CancelImport" onclick="$find(\'{0}\')._closeImport();return false">{2}</button></div>', this.get_id(), resourcesData.Import.StartButton, resourcesModalPopup.CancelButton);
            this._importElement.innerHTML = sb.toLocaleString();
            //document.body.appendChild(this._importElement);
            this._appendModalPanel(this._importElement);
            this._importPopup = $create(AjaxControlToolkit.ModalPopupBehavior, { 'id': this.get_id() + '$ImportPopup', PopupControlID: this._importElement.id, DropShadow: true, BackgroundCssClass: 'ModalBackground' }, null, null, this._container.getElementsByTagName('a')[0]);
            this._saveTabIndexes();
            this._importPopup.show();
        },
        _closeImport: function () {
            this._disposeImport();
            this._restoreTabIndexes();
        },
        _disposeImport: function () {
            if (this._importElement) {
                this._importPopup.hide();
                this._importPopup.dispose();
                this._importPopup = null;
                this._importElement.parentNode.removeChild(this._importElement);
                delete this._importElement;
            }
        },
        _downloadImportTemplate: function (view) {
            this.executeExport({ commandName: 'ExportTemplate', commandArgument: String.format('{0},{1}', this.get_controller(), view) });
        },
        _initImportUpload: function (frameDocument) {
            var div = frameDocument.createElement('div');
            div.innerHTML = String.format('<form method="post" enctype="multipart/form-data"><input type="file" id="ImportFile" name="ImportFile" style="font-size:8.5pt;font-family:tahoma;padding:2px 0px 4px 0px;" onchange="parent.window.$find(\'{0}\')._startImportUpload(this.value);this.parentNode.submit()"/></form>', this.get_id());
            frameDocument.body.appendChild(div);
            //frameDocument.getElementById('ImportFile').focus();
            Sys.UI.DomElement.setFocus(frameDocument.getElementById('ImportFile'));
        },
        _get_importStatus: function () {
            return $get(this.get_id() + '$ImportStatus');
        },
        _get_importFrame: function () {
            return $get(this.get_id() + '$ImportFrame');
        },
        _startImportUpload: function (fileName) {
            var parts = fileName.split(/\\/);
            this._importFileName = parts[parts.length - 1];
            Sys.UI.DomElement.setVisible(this._get_importFrame(), false);
            $(this._get_importStatus()).addClass('Wait');
            this._get_importStatus().innerHTML = resourcesData.Import.Uploading;
        },
        _finishImportUpload: function (frameDocument) {
            Sys.UI.DomElement.removeCssClass(this._get_importStatus(), 'Wait');
            Sys.UI.DomElement.addCssClass(this._get_importStatus(), 'Ready');
            var errors = frameDocument.getElementById('Errors');
            if (errors)
                this._get_importStatus().innerHTML = errors.value;
            else {
                var fileName = frameDocument.getElementById('FileName');
                var numberOfRecords = frameDocument.getElementById('NumberOfRecords');
                var availableImportFields = frameDocument.getElementById('AvailableImportFields').value.trim().split(/\r?\n/);
                var fieldMap = frameDocument.getElementById('FieldMap').value.trim().split(/\r?\n/);
                this._get_importStatus().innerHTML = String.format(resourcesData.Import.MappingInstruction, numberOfRecords.value, this._importFileName);
                this._importFileName = frameDocument.getElementById('FileName').value;
                var importButton = $get(this.get_id() + '$StartImport');
                Sys.UI.DomElement.setVisible(importButton, true);
                //importButton.focus();
                Sys.UI.DomElement.setFocus(importButton);
                var sb = new Sys.StringBuilder();
                sb.append('<table>');
                for (var i = 0; i < fieldMap.length; i++) {
                    var mapping = fieldMap[i].match(/^(.+?)=(.+?)?$/);
                    sb.appendFormat('<tr><td>{2}</td><td><select id="{0}$ImportField{1}"><option value="">{3}</option>', this.get_id(), i, _app.htmlEncode(mapping[1]), resourcesData.Import.AutoDetect);
                    for (var j = 0; j < availableImportFields.length; j++) {
                        var option = availableImportFields[j].split('=');
                        if (option[0] == mapping[2]) {
                            sb.appendFormat('<option value="{0}"', option[0]);
                            sb.append(' selected="selected"');
                            sb.appendFormat('>{0}</option>', _app.htmlEncode(option[1]));
                        }
                    }
                    sb.append('</select></td></tr>');
                }
                sb.append('</table>');
                var importMapElem = $get(this.get_id() + '$ImportMap');
                Sys.UI.DomElement.setVisible(importMapElem, true);
                importMapElem.innerHTML = sb.toString();
                var $importMap = $(importMapElem).find('select').change(function () {
                    refreshOptions();
                });
                var refreshOptions = function () {
                    var unmappedFields = Array.clone(fieldMap);
                    var mappedFields = [];
                    var maxWidth = 0;
                    $importMap.each(function () {
                        $(this).css('width', 'auto');
                        if (this.value != '')
                            Array.add(mappedFields, this.value);
                    }).each(function () {
                        var that = this;
                        $(that).find('option').filter(function () {
                            return that.value != this.value && this.value != '';
                        }).remove();
                        for (var j = 0; j < availableImportFields.length; j++) {
                            var option = availableImportFields[j].split('=');
                            if (!Array.contains(mappedFields, option[0])) {
                                $(this).append($('<option>', { value: option[0] }).text(option[1]));
                            }
                        }
                    }).each(function () {
                        var w = $(this).outerWidth();
                        if (w > maxWidth)
                            maxWidth = w;
                    }).css('width', maxWidth);
                };
                refreshOptions();
            }
            this._importPopup.show();
            this._get_importFrame().parentNode.removeChild(this._get_importFrame());
        },
        _startImportProcessing: function () {
            var emailElem = $get(this.get_id() + '$ImportEmail');
            var email = emailElem.value.replace(/;/g, ',');
            if (isBlank(email) && !confirm(resourcesData.Import.EmailNotSpecified)) {
                //emailElem.focus();
                Sys.UI.DomElement.setFocus(emailElem);
                return;
            }
            var sb = new Sys.StringBuilder();
            sb.appendFormat('{0};{1};{2};{3};', this._importFileName, this.get_controller(), this._importView, email);
            var i = 0;
            while (true) {
                var mapping = $get(this.get_id() + '$ImportField' + i);
                if (!mapping) break;
                sb.append(mapping.value);
                sb.append(';');
                i++;
            }
            this.executeCommand({ commandName: 'ProcessImportFile', commandArgument: sb.toString() });
            this._closeImport();
            alert(resourcesData.Import.Processing);
            this.refresh();
        },
        toggleSelectedRow: function (index) {
            var startIndex = index != null ? index : 0,
                endIndex = index != null ? index : this._rows.length - 1,
                btn = $get(this.get_id() + '_ToggleButton'),
                i, j, key, checked, cb, elem, si;
            for (i = startIndex; i <= endIndex; i++) {
                key = this._createRowKey(i);
                j = Array.indexOf(this._selectedKeyList, key);
                if (j != -1)
                    Array.removeAt(this._selectedKeyList, j);
                checked = index == null ? btn.checked : j == -1;
                if (checked)
                    Array.add(this._selectedKeyList, key);
                cb = $get(this.get_id() + '_CheckBox' + i);
                if (cb) {
                    cb.checked = checked;
                    if (checked)
                        $(cb).addClass('Selected');
                    else
                        $(cb).removeClass('Selected');
                    elem = cb;
                    while (elem && elem.tagName != 'TR')
                        elem = elem.parentNode;
                    if (checked)
                        $(elem).addClass('MultiSelectedRow');
                    else
                        $(elem).removeClass('MultiSelectedRow');
                }
            }
            this._skipCellFocus = this.get_isDataSheet();
            this.set_selectedValue(this._selectedKeyList.join(';'));
            si = $get(this.get_id() + '$SelectionInfo');
            if (si) si.innerHTML = !this._selectedKeyList.length ? '' : String.format(resourcesPager.SelectionInfo, this._selectedKeyList.length);
            if (index >= 0)
                this.executeRowCommand(index, 'Select');
            else
                this.delayedRefresh();
        },
        get_isDisplayed: function () {
            if (this._hidden) return false;
            var elem = this.get_element(),
                node;
            if (!elem)
                return false;
            node = elem && elem.parentNode;
            while (node != null) {
                if (node.getAttribute && node.tagName !== 'TABLE' && this.dataAttr(node, 'activator') && !node._activated)
                    return false;
                if (node.style && node.style.display === 'none')
                    return false;
                node = node.parentNode;
            }
            return true;
        },
        dataAttr: function (element, name, value) {
            var $elem = $(element);
            var dataAttrName = 'data-' + name;
            if (!value) {
                value = $elem.attr(dataAttrName);
                if (!value)
                    value = $elem.attr('factory:' + name);
                return value;
            }
            else
                $elem.attr(dataAttrName, value);
        },
        _closeLookup: function (field) {
            $closeHovers();
            if (field && field._lookupModalBehavior) {
                field._lookupModalBehavior.hide();
                $removeHandler(document.body, 'keydown', field._lookupDataControllerBehavior._bodyKeydownHandler);
            }
            this._lookupIsActive = false;
            if (_window.event) {
                var ev = new Sys.UI.DomEvent(event);
                ev.stopPropagation();
                ev.preventDefault();
            }
        },
        _collectFieldValues: function (all) {
            //if (all == null) all = false;
            all = true;
            var values,
                selectedRow,
                inserting;
            //    extension = this.extension();
            //if (extension && extension.collect)
            //    return extension.collect();
            inserting = this.inserting();
            values = new Array();
            selectedRow = this.get_selectedRow();
            if (!selectedRow && !inserting) return values;
            for (var i = 0; i < this._allFields.length; i++) {
                var field = this._allFields[i],
                    isRadioButtonList = field.ItemsStyle == 'RadioButtonList',
                    element = this._get('_Item', i);
                if (field.ReadOnly && !all)
                    element = null;
                else if (isRadioButtonList) {
                    var j = 0,
                        option = $get(this.get_id() + '_Item' + i + '_' + j);
                    while (option) {
                        if (option.checked) {
                            element = option;
                            break;
                        }
                        else
                            element = null;
                        j++;
                        option = $get(this.get_id() + '_Item' + i + '_' + j);
                    }
                }
                else if (field.ItemsStyle == 'CheckBoxList' && element) {
                    j = 0;
                    option = $get(this.get_id() + '_Item' + i + '_' + j);
                    if (option) {
                        element.value = '';
                        while (option) {
                            if (option.checked) {
                                if (element.value.length > 0) element.value += ',';
                                element.value += option.value;
                            }
                            j++;
                            option = $get(this.get_id() + '_Item' + i + '_' + j);
                        }
                    }
                }
                if (field.ClientEditor && element) {
                    if (field.ClientEditor == 'Web$DataView$RichText') {
                        var factory = _app.EditorFactories[field.ClientEditor.replace('.', '$')]
                        if (factory.persist)
                            factory.persist(element);
                    }
                }
                else if (field.Editor && element) {
                    var frame = $get(element.id + '$Frame');
                    if (frame) {
                        editor = _app.Editors[field.EditorId];
                        if (editor)
                            element.value = editor.GetValue();

                    }
                }
                var elementValue = element ? element.value : null;
                if (elementValue)
                    if (field.Type.startsWith('Date')) {
                        var d = Date.tryParseFuzzyDate(elementValue, field.DataFormatString);
                        if (d != null && element.type == 'text')
                            elementValue = element.value = field.DateFmtStr ? String.format(field.DateFmtStr, d) : field.format(d);
                    }
                    else if (!isBlank(field.DataFormatString) && field.isNumber()) {
                        /* == '{0:c}' ir -- '{0:p} */
                        var n = Number.tryParse(elementValue);
                        if (n != null) {
                            if (field.DataFormatString.match(/\{0:p\}/i) && n > 1)
                                n = n / 100;
                            elementValue = element.value = field.format(n);
                        }
                    }
                if (field.TimeFmtStr) {
                    var timeElem = this._get('_Item$Time', i);
                    if (timeElem) {
                        d = Date.tryParseFuzzyTime(timeElem.value);
                        if (d != null) {
                            timeElem.value = String.localeFormat(field.TimeFmtStr, d);
                            elementValue += ' ' + timeElem.value;
                        }
                    }
                }
                if (!field.OnDemand && (element || field.IsPrimaryKey || (!field.ReadOnly || all))) {
                    var add = true;
                    var readOnly = false;
                    if (this._lastCommandName == 'BatchEdit') {
                        var cb = $get(String.format('{0}$BatchSelect{1}', this.get_id(), field.Index));
                        readOnly = field.TextMode == 4 || field.Hidden || field.ReadOnly;
                        add = field.IsPrimaryKey || readOnly || cb && cb.checked;
                    }
                    if (add) Array.add(values,
                        {
                            Name: field.Name, OldValue: inserting ? (/*this._newRow ? this._newRow[field.Index] : */null) : selectedRow[field.Index],
                            NewValue: element && elementValue != null ? (field.Type == 'Boolean' && elementValue.length > 0 ? elementValue == 'true' : (elementValue.length == 0 ? null : elementValue)) : (!inserting && (field.TextMode == 4 || field.Hidden || field.ReadOnly) ? selectedRow[field.Index] : null),
                            Modified: (element != null && !(!inserting && field.Type == 'String' && isNullOrEmpty(elementValue) && isNullOrEmpty(selectedRow[field.Index])) || isRadioButtonList && inserting && !field.AllowNulls),
                            ReadOnly: field.ReadOnly && !(field.IsPrimaryKey && inserting) || readOnly
                        });
                }
            }
            for (i = 0; i < this._externalFilter.length; i++) {
                var filterItem = this._externalFilter[i];
                for (j = 0; j < values.length; j++) {
                    var v = values[j];

                    if (v.Name.toLowerCase() == filterItem.Name.toLowerCase() && v.NewValue == null) {
                        v.NewValue = typeof filterItem.Value == 'string' ? this.convertStringToFieldValue(this.findField(v.Name), filterItem.Value) : filterItem.Value;
                        v.Modified = true;
                        break;
                    }
                }
            }
            return values;
        },
        _showWait: function (force) {
            //   $.mobile.loading('show');
            var waitHtml = resources.Common.WaitHtml;
            if (this.get_fields() == null || force) {
                this._container.innerHTML = this.get_isModal() || this.get_lookupField() ? waitHtml : '<div class="dataview-busy-whitespace"></div>';
                $(this._container).find('.Wait').addClass('dataview');
            }
            else {
                var wait = $get(this.get_id() + '_Wait');
                if (wait) {
                    this._oldWaitHTML = wait.innerHTML;
                    wait.innerHTML = waitHtml;
                }
            }
            var extension = this.extension();
            if (extension)
                extension.wait();
        },
        _hideWait: function () {
            if (this._oldWaitHTML != null) {
                var waitElement = $get(this.get_id() + '_Wait');
                if (waitElement) waitElement.innerHTML = this._oldWaitHTML;
            }
        },
        _get_colSpan: function () {
            return this.get_isForm() ? 2 : this.get_fields().length +
                (this.multiSelect() ? 1 : 0) +
                (this.get_showIcons() ? 1 : 0) +
                (this.get_isDataSheet() ? 1 : 0) +
                (this._actionColumn ? 1 : 0);
        },
        _renderCreateNewBegin: function (sb, field) { if (!isNullOrEmpty(field.ItemsNewDataView)) sb.append('<table cellpadding="0" cellspacing="0"><tr><td>'); },
        _renderCreateNewEnd: function (sb, field) {
            if (!isNullOrEmpty(field.ItemsNewDataView)) {
                sb.append('</td><td>');
                if (this.get_enabled())
                    sb.appendFormat('<a href="#" class="CreateNew" onclick="$find(\'{0}\').createNewLookupValue({1});return false" id="{0}_Item{1}_CreateNewLookupLink" title="{2}"{3}>&nbsp;</a>',
                        this.get_id(), field.Index, String.format(resources.Lookup.NewToolTip, field.Label), String.format(' tabindex="{0}"', $nextTabIndex()));
                sb.append('</td></tr></table>');
            }
        },
        _actionButtonsInScope: function (scope) {
            var actions = this.get_actions(scope);
            if (actions.length == 0) return;
            if (scope == 'Row') {
                var show = false;
                for (var i = 0; i < actions.length; i++) {
                    if (this._isActionAvailable(actions[i])) {
                        show = true;
                        break;
                    }
                }
                if (!show) return null;
            }
            return actions;
        },
        _saveViewVitals: function () {
            this.writeContext('vitals', {
                'PageIndex': this.get_pageIndex(),
                'PageSize': this.get_pageSize(),
                'Filter': this.get_filter(),
                'SortExpression': this.get_sortExpression(),
                'Tag': this.get_tag()
            });
        },
        _restoreViewVitals: function (request) {
            if (request.PageIndex >= 0) return;
            var vitals = this.readContext('vitals');
            if (vitals == null) return;
            request.RequiresRowCount = true;
            request.RequiresMetaData = true;
            if (request.PageIndex == -1 && vitals.Filter && request.Filter) {
                request.Tag = vitals.Tag;
                request.PageIndex = vitals.PageIndex;
                request.PageSize = vitals.PageSize;
                if (request.FilterIsExternal) {
                    var newFilter = request.Filter;
                    for (var i = 0; i < vitals.Filter.length; i++) {
                        var lastFilterExpression = vitals.Filter[i];
                        var lastFilterExpressionFieldName = lastFilterExpression.substring(0, lastFilterExpression.indexOf(':'));
                        var found = false;
                        for (var j = 0; j < request.Filter.length; j++) {
                            var newFilterExpression = request.Filter[j];
                            var newExpressionFilterName = newFilterExpression.substring(0, newFilterExpression.indexOf(':'));
                            if (newExpressionFilterName == lastFilterExpressionFieldName) {
                                found = true;
                                break;
                            }
                        }
                        if (!found)
                            Array.add(newFilter, lastFilterExpression);
                    }
                    request.Filter = Array.clone(newFilter);
                }
                else
                    if (request.Filter == null || request.Filter.length == 0)
                        request.Filter = Array.clone(vitals.Filter);
                request.SortExpression = vitals.SortExpression;
                if (!this.get_isDataSheet() || !this._get_focusedCell()) {
                    var gridType = this.readContext('GridType');
                    if (gridType != null)
                        this.changeViewType(gridType);
                }
            }
        },
        _allowEdit: function () {
            return this._findActionsByCommandName('Edit').length > 0;
        },
        _allowNew: function () {
            return this._findActionsByCommandName('New').length > 0;
        },
        get_interactiveActionGroups: function () {
            var actionGroups = this.get_actionGroups('Grid');
            Array.addRange(actionGroups, this.get_actionGroups('ActionBar'));
            Array.addRange(actionGroups, this.get_actionGroups('Form'));
            Array.addRange(actionGroups, this.get_actionGroups('ActionColumn'));
            return actionGroups;
        },
        _findActionsByCommandName: function (commandName) {
            var result = [];
            var actionGroups = this.get_interactiveActionGroups();
            for (var i = 0; i < actionGroups.length; i++) {
                actions = actionGroups[i].Actions;
                for (var j = 0; j < actions.length; j++) {
                    var a = actions[j];
                    if (a.CommandName == commandName)
                        Array.add(result, a);
                }
            }
            return result;
        },
        _enableButtons: function (enable) {
            $('button', this._element)
                .each(function () {
                    $(this).toggleClass('disabled', !enable);
                });
        },
        _valueFocused: function (index) {
            var field = this._allFields[index];
            this._focusedFieldName = field.Name;
            _app._focusedDataViewId = this._id;
            _app._focusedItemIndex = index;
        },
        _resetContextLookupValues: function (field) {
            var values = [],
                map = {};
            this._enumerateContextFieldValues(field, values, map);
            var result = values.length > 0;
            if (result)
                this.refresh(true, values);
            return result;
        },
        _copyStaticLookupValues: function (field) {
            if (!isNullOrEmpty(field.Copy) && (field.ItemsStyle == 'RadioButtonList' || field.ItemsStyle == 'ListBox' || field.ItemsStyle == 'DropDownList')) {
                var currentRow = this._collectFieldValues(),
                    selectedValue = currentRow[field.Index].NewValue,
                    selectedItem = null,
                    items = field.DynamicItems || field.Items;
                if (selectedValue != null && typeof selectedValue != 'string')
                    selectedValue = selectedValue.toString();
                for (var i = 0; i < items.length; i++) {
                    var item = items[i],
                        itemValue = item[0];
                    if (itemValue != null && typeof itemValue != 'string') itemValue = itemValue.toString();
                    if (itemValue == selectedValue) {
                        selectedItem = item;
                        break;
                    }
                }
                if (selectedItem) {
                    var values = [],
                        index = 2, m;
                    while (m = _app._fieldMapRegex.exec(field.Copy))
                        Array.add(values, { 'name': m[1], 'value': selectedItem[index++] });
                    if (_touch)
                        //this.extension().afterCalculate(values);
                        _app.input.execute({ dataView: this, values: values });
                    else
                        this.refresh(true, values);
                    return true;
                }
            }
            return false;
        },
        _replaceFieldValue: function (field) {
            var expressions = this._enumerateExpressions(Web.DynamicExpressionType.RegularExpression, Web.DynamicExpressionScope.Field, field.Name);
            for (var j = 0; j < expressions.length; j++) {
                var exp = expressions[j];
                try {
                    if (exp.Result.match(/\$(\d|\'\`)/)) {
                        var currentRow = this._collectFieldValues();
                        var v = currentRow[field.Index];
                        var s = v.NewValue ? v.NewValue.toString() : null;
                        var re = new RegExp(exp.Test);
                        var s2 = s.replace(re, exp.Result);
                        if (s2 != s) {
                            var values = [{ 'name': field.Name, 'value': s2 }];
                            this.refresh(true, values);
                        }
                    }
                }
                catch (ex) {
                    // do nothing
                }
            }
        },
        _quickFind_keydown: function (e) {
            if (e.keyCode == Sys.UI.Key.enter) {
                e.preventDefault();
                e.stopPropagation();
                this.quickFind();
            }
            else if (e.keyCode === Sys.UI.Key.down) {
                return;
                //if (this.get_isDataSheet() && this._totalRowCount > 0) {
                //    e.preventDefault();
                //    e.stopPropagation();
                //    if (!this._get_focusedCell())
                //        this._startInputListenerOnCell(0, 0);
                //    else
                //        this._lostFocus = false;
                //    var elem = this._focusCell(-1, -1, true);
                //    elem.focus();
                //}
            }
        },
        get_showModalForms: function () {
            return this._showModalForms == true;
        },
        set_showModalForms: function (value) {
            this._showModalForms = value;
        },
        _javaScriptRowValue: function (fieldIndex, source) {
            var that = this,
                v = that._javaScriptRow[fieldIndex],
                field,
                fv;
            if (!that._javaScriptRowConvert)
                return v;
            field = that._allFields[fieldIndex];
            fv = { Name: field.Name, NewValue: v, Modified: true };
            return that._validateFieldValues([fv], false, false, false) ? fv.NewValue : null;
        },
        refreshChildren: function () {
            var that = this,
                dataView;
            dataView = that.get_parentDataView(that);
            dataView._forceChanged = true;
            dataView._raiseSelectedDelayed = true;
            if (!dataView._isBusy)
                dataView.refresh(true);
        },
        showViewMessage: function (message) {
            var elem = this._get('$HeaderText');
            if (elem != null && message) {
                var headerText = String.format('<div class="MsgBox">{1} <a href="javascript:" onclick="$find(\'{0}\').hideViewMessage();return false;" class="Close" title="{2}">&nbsp;</a></div>', this.get_id(), message, resourcesModalPopup.Close);
                var view = this.get_view();
                if (!view.OriginalHeaderText)
                    view.OriginalHeaderText = view.HeaderText;
                view.HeaderText = headerText;
                elem.innerHTML = headerText;
                if (!this._viewMessages)
                    this._viewMessages = {};
                this._viewMessages[view.Id] = message;

            }
        },
        refreshAndResize: function () {
            this.cancelDataSheetEdit();
            this.goToPage(-1);
            delete this._viewColumnSettings;
        },
        get_selectedValues: function () {
            var dataView = this.get_parentDataView(this); // this;
            //if (!isNullOrEmpty(this._parentDataViewId))
            //    dataView = $find(this._parentDataViewId);
            var selection = dataView ? dataView.get_selectedValue() : [],
                selectionLength, nullIndex;
            selection = !selection.length ? [] : (!dataView.multiSelect() ? [selection] : selection.split(';'));
            nullIndex = Array.indexOf(selection, 'null');
            if (nullIndex !== -1)
                selection.splice(nullIndex, 1);
            return selection;
        },
        _busy: function (isBusy) {
            var that = this,
                api = that._api;
            if (isBusy == null)
                return that._isBusy;
            if (api && api.background)
                return;
            that._isBusy = isBusy;
            that._enableButtons(!isBusy);
            //if (_app.isSaaS()) return;
            var interval = that._busyInterval,
                atWindowTop = !_touch && (that.get_isModal() || that.get_lookupField() != null || !this._controller) || _touch != null || this.get_useCase() === '$app',
                containerElement = _touch ? _touch.toolbar() : (atWindowTop ? document.body : that._container),
                $container = $(containerElement),
                $viewContainer = $(that._container),
                busyIndicator;
            if (isBusy && !interval) {
                if (!_touch && !$viewContainer.is('.dataview-loaded'))
                    $viewContainer.addClass('dataview-loading');
                var w = $container.outerWidth() / 5;
                if (w > 200)
                    w = 200;
                var $busy = that._$busy = $(String.format('<div class="dataview-busy-indicator{0}"></div>', atWindowTop ? ' modal' : ''))
                    .css({ position: 'absolute', width: w, 'z-index': atWindowTop ? (_touch ? 5000 : 3000000) : 0 }),
                    x = -w,
                    h = atWindowTop ? 0 : $busy.height();
                $busy.hide().appendTo(document.body);
                var counter = 0,
                    doShow, isHidden;

                this._busyInterval = setInterval(function () {
                    if (counter != null)
                        if (counter++ > (_touch ? 35 : 75)) {
                            counter = null;
                            doShow = true;
                        }
                        else
                            return;
                    x += Math.ceil(w / 30);
                    if (doShow) {
                        if (!atWindowTop || !_app._busyIndicator) {
                            _app._busyIndicator = true;
                            $busy.show();
                        }
                        else {
                            isHidden = true;
                            $busy.hide();
                        }
                        doShow = false;
                    }
                    else if (isHidden && !_app._busyIndicator) {
                        isHidden = false;
                        _app._busyIndicator = true;
                        $busy.show();
                    }
                    if (x >= 0) {
                        var containerWidth = $container.outerWidth();
                        if (x >= (containerWidth - w) && x < containerWidth)
                            $busy.width(containerWidth - x);
                        else if (x >= containerWidth) {
                            x = -w;
                        }
                        if (!isHidden)
                            $busy.position({ my: 'left top', at: String.format('left+{0} top{1}{2}', x, atWindowTop ? '+' : '-', atWindowTop ? $window.scrollTop() : h), of: $container });
                    }
                    else {
                        if (!isHidden) {
                            $busy.width(w + x);
                            $busy.position({ my: 'left top', at: String.format('left top{0}{1}', atWindowTop ? '+' : '-', atWindowTop ? $window.scrollTop() : h), of: $container });
                        }
                    }
                }, 1000 / 60);
            }
            else if (interval) {
                if (!_touch && !$viewContainer.is('.dataview-loaded'))
                    $viewContainer.removeClass('dataview-loading').addClass('dataview-loaded');
                clearInterval(interval);
                that._busyInterval = null;
                $busy = that._$busy;
                if ($busy) {
                    var busyOffset = $busy.offset();
                    var containerOffset = $container.offset();
                    that._$busy = null;
                    $busy.width($container.outerWidth() - (busyOffset.left - containerOffset.left));
                    setTimeout(function () {
                        $busy.remove();
                        if (atWindowTop)
                            _app._busyIndicator = false;
                    }, 500);
                }
            }
        },
        _onMethodFailed: function (err, response, context) {
            var that = this,
                msg,
                viewId = that._viewId,
                exceptionType = err.get_exceptionType(),
                statusCode = err.get_statusCode(),
                stackTrace = err.get_stackTrace(),
                divider = '///';
            that._busy(false);
            if (_app._navigated) return;
            msg = [String.format('<pre style="word-wrap:break-word;white-space:pre-wrap;margin:0px">{0}\n{1}\ncomponent: {2}; controller: {3}', err.get_message(), divider, that._id, that._controller)];
            if (viewId)
                msg.push('; view: ' + viewId);
            if (statusCode)
                msg.push('; status: ' + statusCode);
            if (exceptionType)
                msg.push('; exception: ' + exceptionType);
            if (stackTrace)
                msg.push('\n' + divider, stackTrace);
            msg.push('</pre>');
            //_app.showMessage(String.format('<pre style="word-wrap:break-word;white-space:pre-wrap;margin:0px">Component: {4}\r\nController: {5}; View: {6}; Timed out: {0}; Status Code: {7};\r\nException: {1}\r\nMessage: {2}\r\nStack:\r\n{3}</pre>',
            //    err.get_timedOut(), err.get_exceptionType(), err.get_message(), err.get_stackTrace(), this.get_id(), this.get_controller(), this.get_viewId(), err.get_statusCode()));
            _app.showMessage(msg);
            $(this.get_element()).css('border', '1px red solid');
        },
        /********************/
        /*** dummy method ***/
        /********************/
        __pasteMethodsAbove: function () { }
    };

    // declaration of methods specific to Membership API

    classicMembershipApi = {
        initialize: function () {
            _wm.callBaseMethod(this, 'initialize');
            if (!_wm._instance) _wm._instance = this;
            this._loginButtonClickHandler = Function.createDelegate(this, this._loginButtonClick);
            this._loginDialogMouseOverHandler = Function.createDelegate(this, this._loginDialogMouseOver);
            this._loginDialogMouseOutHandler = Function.createDelegate(this, this._loginDialogMouseOut);
            this._login_CompletedHandler = Function.createDelegate(this, this._login_Completed);
            this._method_FailureHandler = Function.createDelegate(this, this._method_Failure);
            this._textBoxKeyPressHandler = Function.createDelegate(this, this._textBoxKeyPress);
            this._body_keydownDelegate = Function.createDelegate(this, this._body_keydown);
            this._body_mousemoveDelegate = Function.createDelegate(this, this._body_mousemove);
            $addHandler(document.body, 'keydown', this._body_keydownDelegate);
            $addHandler(document.body, 'mousemove', this._body_mousemoveDelegate);
            this._window_beforeUnloadDelegate = Function.createDelegate(this, this._window_beforeUnload);
            $addHandler(window, 'beforeunload', this._window_beforeUnloadDelegate);
        },
        dispose: function () {
            this.idleInterval(false);
            this._disposeIdentityResources();
            $removeHandler(window, 'beforeunload', this._window_beforeUnloadDelegate);
            $removeHandler(document.body, 'keydown', this._body_keydownDelegate);
            $removeHandler(document.body, 'mousemove', this._body_mousemoveDelegate);
            if (this._loginButton) $clearHandlers(this._loginButton);
            if (this._loginDialog) $clearHandlers(this._loginDialog);
            if (this._userName) $clearHandlers(this._userName);
            if (this._password) $clearHandlers(this._password);
            delete this._membershipBar;
            delete this._bookmarkBar;
            this._hideHistory();
            _wm.callBaseMethod(this, 'dispose');
        },
        updated: function () {
            _wm.callBaseMethod(this, 'updated');
            var barResources = resourcesMembership.Bar,
                that = this;
            that.idleInterval(true);
            that._updateLastActivity();
            if (!String.isNullOrEmpty(that.get_cultures())) {
                that._cultureList = [];
                var cultures = String.format('Detect,Detect|{0}|False;{1}', resourcesMembership.Bar.AutoDetectLanguageOption, that.get_cultures());
                var list = cultures.split(/;/);
                var family = 'Membership$Cultures';
                var items = new Array();
                for (var i = 0; i < list.length; i++) {
                    if (String.isBlank(list[i]))
                        continue;
                    var cultureInfo = list[i].split(/\|/);
                    Array.add(that._cultureList, cultureInfo);
                    var item = new Web.Item(family, cultureInfo[1]);
                    if (cultureInfo[2] == 'True')
                        item.set_selected(true);
                    item.set_script(String.format('$find(\'{0}\').changeCulture(\'{1}\');', that.get_id(), cultureInfo[0]));
                    Array.add(items, item);
                    if (i == 0)
                        Array.add(items, new Web.Item());
                }
                $registerItems(family, items, Web.HoverStyle.ClickAndStay, Web.PopupPosition.Right, Web.ItemDescriptionStyle.None);
            }
            var bar = document.createElement('div');
            bar.className = 'MembershipBarPlaceholder';
            document.body.insertBefore(bar, document.body.childNodes[0]);
            that._membershipBar = $get('Membership_Login');
            var loggedIn = that.loggedIn();
            if (!that._membershipBar) {
                that._membershipBar = document.createElement('div');
                if (document.body.childNodes.length > 0)
                    document.body.insertBefore(that._membershipBar, document.body.childNodes[0]);
                else
                    document.body.appendChild(that._membershipBar);
                var sb = new Sys.StringBuilder();
                that._membershipBar.id = 'Membership_Login';
                that._membershipBar.className = 'MembershipBar';
                if (that._cultureList && !(__tf != 4))
                    sb.append(String.format('<div style="float:right" class="CultureLink"> | <a href="javascript:" onclick="$toggleHover();return false;" title="{1}" onfocus="$showHover(this, \'Membership$Cultures\', \'CultureSelector\', 1)" onblur="$hideHover(this)" onmouseover="$showHover(this, \'Membership$Cultures\', \'CultureSelector\', 1)" onmouseout="$hideHover(this)">{0}</a></div>', this.get_cultureName(), barResources.ChangeLanguageToolTip));
                if (this.get_displayHelp())
                    sb.append(String.format('<div style="float:right" class="HelpLink"> | <a href="javascript:" onclick="$find(&quot;{0}&quot;).help();return false;">{1}</a></div>', this.get_id(), barResources.HelpLink));
                if (!loggedIn && this.get_authenticationEnabled()) {
                    if (this.get_displayLogin())
                        sb.append(String.format(
                            '<table id="LoginDialog" cellpadding="0" class="LoginDialog">' +
                            '<tr><td id="Anchor"><a href="javascript:" onfocus="$find(&quot;{0}&quot;).changeLoginDialogVisibility(true);return false" >{1}</a>{2}</td></tr>' +
                            '<tr id="LoginControlsRow"><td id="LoginControls"><table>' +
                            '<tr><td align="right" nowrap="nowrap">{3}</td><td><input type="text" id="UserName" size="20" value="" /></td></tr>' +
                            '<tr><td align="right" nowrap="nowrap">{4}</td><td><input type="password" id="Password" size="20" /></td></tr>' +
                            (this.get_displayRememberMe() ? String.format('<tr><td align="right" colspan="2"><input type="checkbox" id="RememberMe"{0}/><label for="RememberMe">{1}</label></td></tr>', this.get_rememberMeSet() ? ' checked="checked"' : '', barResources.RememberMe) : '') +
                            (this.get_displayPasswordRecovery() ? '<tr><td>&nbsp;</td><td align="right" nowrap="nowrap"><a href="javascript:" onclick="$find(&quot;{0}&quot).passwordRecovery();return false;" id="PasswordRecovery">{6}</a></td></tr>' : '') +
                            (this.get_displaySignUp() ? '<tr><td>&nbsp;</td><td align="right" nowrap="nowrap"><a href="javascript:" onclick="$find(&quot;{0}&quot).signUp();return false;" id="SignUp">{7}</a></td></tr>' : '') +
                            '<tr><td>&nbsp;</td><td align="right"><button id="Login">{5}</button></td></tr>' +
                            '</table></td></tr></table>', this.get_id(), barResources.LoginLink, barResources.LoginText,
                            barResources.UserName, barResources.Password, barResources.LoginButton,
                            barResources.ForgotPassword, barResources.SignUp));
                }
                else
                    sb.append(String.format(
                        '<table id="LoginDialog" cellpadding="0" class="LoginDialog LoginDialogCollapsed"><tr><td>' +
                        (this.get_welcome() && !String.isBlank(this.get_welcome()) ? String.localeFormat(this.get_welcome(), this.get_user(), new Date()) + (this.get_authenticationEnabled() ? ' | ' : '') : '') +
                        (this.get_displayMyAccount() ? '<a id="MyAccount" href="javascript:" onclick="$find(&quot;{0}&quot;).myAccount();return false;">{1}</a> | ' : '') +
                        (this.get_authenticationEnabled() ? '<a href="javascript:" onclick="$find(&quot;{0}&quot;).logout();return false;">{2}</a>' : '') +
                        '</td></tr></table>', this.get_id(), barResources.MyAccount, barResources.LogoutLink));
                this._membershipBar.innerHTML = sb.toString();
                if (loggedIn && (this.get_enablePermalinks() || this.get_enableHistory())) {
                    this._bookmarkBar = document.createElement('div');
                    this._bookmarkBar.className = 'BookmarkBar';
                    bar.appendChild(this._bookmarkBar);
                    sb = new Sys.StringBuilder();
                    sb.append('<table class="Frame"><tr>');
                    if (this.get_enableHistory())
                        sb.appendFormat('<td><a id="{0}_HistoryLink" href="javascript:" onclick="$find(\'{0}\').showHistory();return false" title="{2}">{1}</a></td>', this.get_id(), barResources.History, barResources.HistoryToolTip);
                    if (this.get_enableHistory() && this.get_enablePermalinks())
                        sb.append('<td>|</td>');
                    if (this.get_enablePermalinks())
                        sb.appendFormat('<td><a href="javascript:" onclick="$find(\'{0}\').showPermalink();return false" title="{4}">{1}</a></td><td style="display:none"><input id="{0}_Permalink" type="text" onfocus="this.select();"/></td><td style="display:none"><a id="{0}_AddToFavorites" href="javascript:" onclick="$find(\'{0}\')._addToFavorites();return false" class="AddBookmark" title="{2}">&nbsp;</a></td><td style="display:none"><a id="{0}_CancelFavorites" href="javascript:" onclick="$find(\'{0}\').showPermalink();return false" class="CancelBookmark" title="{3}">&nbsp;</a></td>', this.get_id(), barResources.Permalink, barResources.AddToFavorites, barResources.HelpCloseButton, barResources.PermalinkToolTip);
                    sb.append('</tr></table>');
                    this._bookmarkBar.innerHTML = sb.toString();
                }
            }
            document.body.style.paddingTop = '0px';
            if (!loggedIn && this.get_displayLogin()) {
                this._loginDialog = $get('LoginDialog', this._membershipBar);
                var b = _app.bounds(this._loginDialog); // $common.getBounds(this._loginDialog);
                this._loginDialog.style.width = b.width + 'px';
                if ($get('LoginControlsRow', this._loginDialog))
                    $addHandlers(this._loginDialog, { 'mouseover': this._loginDialogMouseOverHandler, 'mouseout': this._loginDialogMouseOutHandler }, this);
                this._loginButton = $get('Login', this._membershipBar);
                if (this._loginButton) $addHandler(this._loginButton, 'click', this._loginButtonClickHandler);
                $(this._membershipBar).find('input').keyup(function (e) {
                    if (e.which == 13)
                        that.login();
                });
                this._userName = $get('UserName', this._membershipBar);
                if (this._userName) $addHandler(this._userName, 'keypress', this._textBoxKeyPressHandler);
                this._password = $get('Password', this._membershipBar);
                if (this._password) $addHandler(this._password, 'keypress', this._textBoxKeyPressHandler);
                this._rememberMe = $get('RememberMe', this._membershipBar);
                this.changeLoginDialogVisibility(_window.location.href.match(/\?ReturnUrl=(.+)$/) != null);
            }
        },
        get_membershipBar: function () {
            return this._membershipBar;
        },
        get_isLoginDialogVisible: function () {
            return this._isLoginDialogVisible;
        },
        set_isLoginDialogVisible: function (value) {
            this._isLoginDialogVisible = value;
        },
        hideLoginDialog: function () {
            if (this._intevalId) {
                _window.clearInterval(this._intervalId);
                this._intervalId = null;
            }
        },
        addPermalink: function (argList, html) {
            if (!(this.get_enablePermalinks() || this.get_enableHistory())) return;
            var link = location.pathname + '?' + argList;
            this._savePermalinkParams = { 'link': link, 'html': _app.htmlEncode(html) };
            _window.setTimeout('Web.Membership._instance._savePermalink()', 500);
            if (!Sys.UI.DomElement.getVisible(this._membershipBar)) this._encodePermalink_Success('');
        },
        _savePermalink: function () {
            Sys.Net.WebServiceProxy.invoke(this.get_servicePath(), 'SavePermalink', false, this._savePermalinkParams);
        },
        showPermalink: function () {
            if (!this._savePermalinkParams || String.isNullOrEmpty(this._savePermalinkParams.html)) {
                _app.alert(resourcesMembership.Messages.PermalinkUnavailable);
                return;
            }
            this.encodePermalink(this._savePermalinkParams.link, Function.createDelegate(this, this._encodePermalink_Success));
        },
        encodePermalink: function (link, callback) {
            if (!callback)
                callback = function (result) { location.href = result; };
            Sys.Net.WebServiceProxy.invoke(this.get_servicePath(), 'EncodePermalink', false, { 'link': link, 'rooted': true }, callback, Function.createDelegate(this, this._onMethodFailed));
        },
        showHistory: function () {
            if (!this._historyDiv)
                Sys.Net.WebServiceProxy.invoke(this.get_servicePath(), 'ListAllPermalinks', false, null, Function.createDelegate(this, this._showHistory_Success), Function.createDelegate(this, this._method_Failure));
        },
        _focusHistory: function () {
            var rotateButton = $get(this.get_id() + '_RotateHistory');
            if (rotateButton) rotateButton.focus();
        },
        _renderHistory: function () {
            var cb = _app.clientBounds(); // $common.getClientBounds();
            var scrolling = _app.scrolling(); // $common.getScrolling();
            var sb = new Sys.StringBuilder();
            sb.appendFormat('<div onclick="$find(\'{0}\')._hideHistory()" style="width:{1}px;height:{2}px;">', this.get_id(), cb.width, cb.height);
            var cardCount = this._historyData.length;
            if (cardCount > 10) cardCount = 10;
            var x = 0;
            var y = 0;
            var dx = 50;
            var dy = 30;
            if (cardCount <= 3) {
                dx = 65;
                dy = 30;
            }
            else if (cardCount <= 6) {
                dx = 65;
                dy = 30;
            }
            for (var i = cardCount - 1; i >= 0; i--) {
                var card = this._historyData[i][1];
                sb.appendFormat('<div style="position:absolute;background-color:#333333;"></div><div id="{0}_Card{1}" onclick="$find(\'{0}\')._selectHistory({1});return false;" style="position:absolute;left:{2}px;top:{3}px;" onmouseover="if(this._Activated!=99){{this.style.zIndex=600001;this._Activated=99;var s=this.previousSibling;s.style.zIndex=600000;s.style.backgroundColor=\'black\'}}" onmouseout="this.style.zIndex=\'{4}\';this._Activated=0;var s=this.previousSibling;s.style.zIndex=\'{4}\';s.style.backgroundColor=\'#333333\'">', this.get_id(), i, x, y, Sys.Browser.agent == Sys.Browser.InternetExplorer && Sys.Browser.version >= 9 ? -1 : 'auto');
                sb.append(card);
                sb.append('</div>');
                if (i == 0)
                    sb.appendFormat('<a id="{0}_RotateHistory" class="RotateHistory" href="javascript:" onclick="$find(\'{0}\')._rotateHistory(event);return false;"><div id="{0}_RotateButton" title="{3}" style="position:absolute;z-index:600002;left:{1}px;top:{2}px;" class="RotateHistory">&nbsp;</div></a>', this.get_id(), x + 110, y - 15, resourcesMembership.Bar.RotateHistory);
                x += dx;
                y += dy;
            }
            sb.append('</div>');
            this._historyDiv.innerHTML = sb.toString();
            var div = $get(this.get_id() + '_Card0');
            var b = _app.bounds(div); // $common.getBounds(div);
            dx = Math.floor((cb.width - (b.x + b.width)) / 2);
            dy = this._historyOffsetTop ? this._historyOffsetTop : Math.floor((cb.height - (b.y + b.height)) / 2);
            this._historyOffsetTop = dy;
            div = $get(this.get_id() + '_RotateButton');
            div.style.left = (div.offsetLeft + dx) + 'px';
            div.style.top = (div.offsetTop + dy) + 'px';
            if (cardCount == 1) {
                div.style.width = '1px';
                div.style.height = '1px';
            }
            for (i = 0; i < cardCount; i++) {
                div = $get(this.get_id() + '_Card' + i);
                div.style.left = (div.offsetLeft + dx) + 'px';
                div.style.top = (div.offsetTop + dy) + 'px';
                b = _app.bounds(div); // $common.getBounds(div);
                b.x += 10 - scrolling.x;
                b.y += 4 - scrolling.y;
                var shadow = div.previousSibling;
                shadow.style.left = b.x + 'px';
                shadow.style.top = b.y + 'px';
                shadow.style.width = (b.width - 13) + 'px';
                shadow.style.height = (b.height - 0) + 'px';
            }
        },
        _selectHistory: function (i) {
            this.encodePermalink(this._historyData[i][0]);
        },
        _hideHistory: function () {
            if (this._historyModalPopup) {
                this._historyModalPopup.hide();
                if (this._historyDiv) {
                    this._historyDiv.parentNode.removeChild(this._historyDiv);
                    delete this._historyDiv;
                }
                this._historyModalPopup.dispose();
                delete this._historyModalPopup;
            }
        },
        _rotateHistory: function (e) {
            var item = this._historyData[0];
            Array.removeAt(this._historyData, 0);
            Array.add(this._historyData, item);
            this._renderHistory();
            this._focusHistory();
            try {
                var ev = new Sys.UI.DomEvent(e);
                ev.stopPropagation();
                ev.preventDefault();
            }
            catch (ex) {
                // do nothing
            }
        },
        _showHistory_Success: function (result) {
            if (!result.length) {
                _app.alert(resourcesMembership.Messages.HistoryUnavailable);
                return;
            }
            this._historyData = result;
            var panel = this._historyDiv = document.createElement('div');
            document.body.appendChild(panel);
            panel.id = this.get_id() + '_HistoryPanel';
            panel.className = 'History';
            this._historyOffsetTop = null;
            this._renderHistory();
            this._historyModalPopup = $create(AjaxControlToolkit.ModalPopupBehavior, {
                PopupControlID: panel.id, DropShadow: false, BackgroundCssClass: 'ModalBackground'
            }, null, null, $get(this.get_id() + '_HistoryLink'));
            this._historyModalPopup.show();
            this._focusHistory();
        },
        _encodePermalink_Success: function (result) {
            var input = $get(this.get_id() + '_Permalink');
            var btn = $get(this.get_id() + '_AddToFavorites');
            var btn2 = $get(this.get_id() + '_CancelFavorites');
            var show = !Sys.UI.DomElement.getVisible(input.parentNode);
            Sys.UI.DomElement.setVisible(input.parentNode, show);
            Sys.UI.DomElement.setVisible(btn.parentNode, show);
            Sys.UI.DomElement.setVisible(btn2.parentNode, show);
            Sys.UI.DomElement.setVisible(this._membershipBar, !show);
            if (show) input.value = result;
            input.parentNode.title = this._savePermalinkParams.html.replace(/<div class="Value">/g, ' = ').replace(/(\s*<.+?>\s*)+/g, '\r\r').trim().replace(/&\w+;/g, '').replace(/(\r\r)+/g, '; ').replace(/;\s*=/g, ' = ').replace(/=\s*;/g, ' = ');
        },
        _addToFavorites: function () {
            this._encodePermalink_Success('');
            var permalink = $get(this.get_id() + '_Permalink');
            var title = permalink.parentNode.title;
            var url = permalink.value;
            if (_window.sidebar) // firefox
                _window.sidebar.addPanel(title, url, "");
            else if (_window.opera && _window.print) { // opera
                var elem = document.createElement('a');
                elem.setAttribute('href', url);
                elem.setAttribute('title', title);
                elem.setAttribute('rel', 'sidebar');
                elem.click();
            }
            else if (document.all)// ie
                _window.external.AddFavorite(url, title);
        },
        changeLoginDialogVisibility: function (visible, delay) {
            if (this._intevalId) {
                _window.clearInterval(this._intevalId);
                this._intevalId = null;
            }
            if (delay)
                this._intevalId = _window.setInterval(String.format('$find("{0}").changeLoginDialogVisibility({1})', this.get_id(), visible), delay);
            else {
                if (visible != this.get_isLoginDialogVisible()) {
                    var loginControls = $get('LoginControlsRow', this._membershipBar);
                    if (loginControls) {
                        if (visible)
                            Sys.UI.DomElement.removeCssClass(this._loginDialog, 'LoginDialogCollapsed');
                        else
                            Sys.UI.DomElement.addCssClass(this._loginDialog, 'LoginDialogCollapsed');
                        Sys.UI.DomElement.setVisible(loginControls, visible);
                    }
                    if (visible && !(document.activeElement && document.activeElement.id == 'Password'))
                        this._userName.focus();
                    this.set_isLoginDialogVisible(visible);
                    if (visible) Web.HoverMonitor._instance.close()
                }
            }
        },
        _idle: function () {
            Web.HoverMonitor._instance.close();
            var l = Sys.Application.getComponents();
            for (var i = l.length - 1; i >= 0; i--) {
                var c = l[i];
                if (Web.DataView.isInstanceOfType(c)) {
                    if (c.get_isModal())
                        c.endModalState('Cancel');
                    else if (c.get_lookupField())
                        c.hideLookup();
                }
            }
            this._protecting = true;
            var dialog = this._idleDialog = document.createElement('div');
            dialog.id = this.get_id() + '$IdentityValidation';
            document.body.appendChild(dialog);
            dialog.innerHTML = String.format('<div class="ModalPlaceholder FixedDialog UserIdle"><div class="Text">{1}</div><div class="Buttons"><button onclick="$find(\'{0}\').logout();return false;" >{2}</button></div></div>', this.get_id(), resourcesMembership.Bar.UserIdle, resourcesMembership.Bar.LoginLink);
            this._identityModalPopup = $create(AjaxControlToolkit.ModalPopupBehavior, { PopupControlID: dialog.id, DropShadow: true, BackgroundCssClass: 'ModalBackground' }, null, null, this._membershipBar.getElementsByTagName('a')[0]);
            this._identityModalPopup.show();
        },
        _body_keydown: function (e) {
            this._updateLastActivity();
            if (this._historyDiv) {
                if (e.keyCode == Sys.UI.Key.esc) {
                    e.preventDefault();
                    this._hideHistory();
                }
                else if (e.keyCode == Sys.UI.Key.tab) {
                    e.preventDefault();
                    this._rotateHistory();
                }
                else if (e.keyCode == Sys.UI.Key.enter) {
                    e.preventDefault();
                    this._selectHistory(0);
                }
            }
        },
        _body_mousemove: function (e) {
            this._updateLastActivity();
        },
        _window_beforeUnload: function (e) {
            if (this._protecting) {
                this._protecting = false;
                this._disposeIdentityResources();
                this.logout();
            }
        },
        _login_Completed: function (validCredentials) {
            this._wait(false);
            if (!validCredentials) {
                var that = this;
                _app.alert(resourcesMembership.Messages.InvalidUserNameAndPassword, function () {
                    if (!_touch)
                        that.changeLoginDialogVisibility(true);
                    that._userName.focus();
                });
            }
            else {
                var returnUrl = _window.location.href.match(/\?ReturnUrl=(.+)$/);
                setTimeout(function () {
                    _app._navigated = true;
                    _window.location.replace(_app.unanchor(returnUrl ? unescape(returnUrl[1]) : _window.location.href));
                });
            }
        },
        _method_Failure: function (error, userContext, methodName) {
            this._wait(false);
            _app.alert(String.format('Method {0} has failed. {1}', methodName, error.get_message()));
        },
        _loginButtonClick: function (e) {
            this.login();
        },
        _loginDialogMouseOver: function (e) {
            this.changeLoginDialogVisibility(true, 50);
        },
        _loginDialogMouseOut: function (e) {
            this.changeLoginDialogVisibility(false, 500);
        },
        _textBoxKeyPress: function (e) {
            if (e.charCode == Sys.UI.Key.enter) {
                e.preventDefault();
                this.login();
            }
            if (e.charCode == Sys.UI.Key.esc) {
                e.preventDefault();
                this.set_isLoginDialogVisible(true);
                this.changeLoginDialogVisibility(false);
            }
        },
        login: function () {
            var that = this;
            that.loggedIn();
            if (that._waitDataView && that._waitDataView._busy())
                return;
            if (this._userName && this._password) {
                var isBlank = /^\s*$/;
                if (isBlank.exec(this._userName.value)) {
                    _app.alert(resourcesMembership.Messages.BlankUserName, function () {
                        that.set_isLoginDialogVisible(false);
                        that._userName.focus();
                    });
                    return;
                }
                if (isBlank.exec(this._password.value)) {
                    this.set_isLoginDialogVisible(false);
                    _app.alert(resourcesMembership.Messages.BlankPassword, function () {
                        that.set_isLoginDialogVisible(false);
                        that._password.focus();
                    });
                    return;
                }
                this._wait(true);
                //Sys.Services.AuthenticationService.login(this._userName.value, this._password.value, this._rememberMe != null && this._rememberMe.checked, null, null, this._login_CompletedHandler, this._method_FailureHandler, null);
                _app.login(this._userName.value, this._password.value, this._rememberMe != null && this._rememberMe.checked,
                    function () {
                        that._login_CompletedHandler(true);
                    }, function () {
                        that._login_CompletedHandler(false);
                    });
            }
            else
                _app.alert('UserName and/or Password elements are not found in the Memership_Login');
        },
        _wait: function (enable) {
            //if (_touch) return;
            var dataView = this._waitDataView;
            if (!dataView) {
                this._waitDiv = $('<div/>');
                dataView = this._waitDataView = $create(Web.DataView, {}, null, null, this._waitDiv[0]);
            }
            dataView._busy(enable);
        },
        signUp: function () {
            this.changeLoginDialogVisibility(false);
            Web.DataView.showModal($get('SignUp', this.get_membershipBar()), 'MyProfile', 'signUpForm', 'New', 'signUpForm', this.get_baseUrl(), this.get_servicePath());
        },
        passwordRecovery: function () {
            this.changeLoginDialogVisibility(false);
            Web.DataView.showModal($get('PasswordRecovery', this.get_membershipBar()), 'MyProfile', 'passwordRequestForm', 'New', 'passwordRequestForm', this.get_baseUrl(), this.get_servicePath());
        },
        myAccount: function () {
            Web.DataView.showModal($get('MyAccount', this.get_membershipBar()), 'MyProfile', 'myAccountForm', 'Edit', 'myAccountForm', this.get_baseUrl(), this.get_servicePath());
        },
        help: function (fullScreen) {
            if (typeof __settings != 'undefined' && __settings.help) {
                var that = this,
                    pageHelpUrl = that.helpUrl();
                if (_touch)
                    _touch.busy({ progress: true });
                $.ajax(pageHelpUrl).done(function (result) {
                    pageHelpUrl = result.match(/404 Not Found/) ? __baseUrl + 'help' : pageHelpUrl;
                    if (_touch) {
                        _touch.busy({ progress: false });
                        _touch.navigate({ href: pageHelpUrl });
                    }
                    else
                        _window.open(pageHelpUrl, '_blank');
                });
                return;
            }
            var path = _window.location.pathname;
            var helpPath = this.get_baseUrl() == './' ? path.substr(path.lastIndexOf('/'), 100) : '';
            if (helpPath.length == 0) {
                var baseSegments = this.get_baseUrl().split(/\//);
                var pathSegments = path.split(/\//);
                if (baseSegments[baseSegments.length - 1] == '')
                    Array.removeAt(baseSegments, baseSegments.length - 1);
                if (pathSegments[pathSegments.length - 1] == '')
                    Array.removeAt(pathSegments, pathSegments.length - 1);
                if (pathSegments[0] == '')
                    Array.removeAt(pathSegments, 0);
                var levelsUp = baseSegments.length;
                if (pathSegments[pathSegments.length - 1].indexOf('.') == -1)
                    levelsUp--;
                for (var i = pathSegments.length - levelsUp - 1; i < pathSegments.length; i++)
                    helpPath += '/' + pathSegments[i];
            }
            var helpUrl = String.format('{0}help{1}', this.get_baseUrl(), helpPath);
            helpUrl = String.format('{0}Help/Default.aspx?topic={1}', this.get_baseUrl(), encodeURI(helpUrl));
            if (fullScreen) {
                _window.open(helpUrl);
                this.help();
                return;
            }
            if (!this._helpBar) {
                this._helpDiv = document.createElement('div');
                document.body.appendChild(this._helpDiv);
                this._helpDiv.className = 'HelpBar';
                this._helpDiv.innerHTML = String.format('<div class="Title">{1}</div><iframe id="help" frameBorder="0"></iframe><div class="Buttons"><button onclick="$find(&quot;{0}&quot;).help()">{2}</button><button onclick="$find(&quot;{0}&quot;).help(true)">{3}</button></div>',
                    this.get_id(), resourcesMembership.Bar.HelpLink, resourcesMembership.Bar.HelpCloseButton, resourcesMembership.Bar.HelpFullScreenButton);
                this._helpFrame = $get('help', this._helpDiv);
                this._helpBar = $create(AjaxControlToolkit.AlwaysVisibleControlBehavior, { HorizontalSide: AjaxControlToolkit.HorizontalSide.Right, VerticalSide: AjaxControlToolkit.VerticalSide.Top, HorizontalOffset: 18, VerticalOffset: 30 }, null, null, this._helpDiv);
                Sys.UI.DomElement.setVisible(this._helpDiv, false);
            }
            Sys.UI.DomElement.setVisible(this._helpDiv, !Sys.UI.DomElement.getVisible(this._helpDiv));
            if (Sys.UI.DomElement.getVisible(this._helpDiv)) {
                if (this._helpFrame.src == '')
                    this._helpFrame.src = helpUrl;
                this._helpBar._reposition();
            }
        },
        /********************/
        /*** dummy method ***/
        /********************/
        __pasteMethodsAbove: function () { }
    };


    // other API methods

    function parseInteger(s) {
        return parseInt(s, 10);
    }

    _app._load = function () {
        if (_app._loaded) return;
        if (Sys.WebForms && Sys.WebForms.PageRequestManager._instance) Sys.WebForms.PageRequestManager._instance.add_beginRequest(_app._partialUpdateBeginRequest);
        _app._loaded = true;
        updateACT();
        if (typeof appBaseUrl == 'undefined')
            appBaseUrl = '../';
        $('#PageHeaderSideBar .PageLogo').attr('src', appBaseUrl + 'app_themes/_shared/placeholder.gif');
        _app.supportsPlaceholder = 'placeholder' in document.createElement('input');
        var pc = $get('PageContent'),
            hasContent,
            contentPages = [],
            body = $('body');
        if (pc) {
            body.find('div[data-app-role="page"]').each(function () {
                if ($(this).attr('data-content-framework'))
                    contentPages.push($(this).attr('id'));
            }).each(function () {
                var page = $(this),
                    pageId = page.attr('id'),
                    hash = location.search.match(/_hash=(\w+)/),
                    framework = page.attr('data-content-framework'),
                    content = page.find('> div[data-role="content"]');
                if (!content.length) {
                    content = $('<div data-role="content"></div>');
                    page.contents().appendTo(content);
                    content.appendTo(page);
                }
                if (framework)
                    if (!hasContent && (!hash || hash[1] === pageId)) {
                        var table = $(pc).closest('table');
                        page.insertAfter(table);
                        body.addClass('app-min-md app-min-lg app-theme-' + __settings.ui.theme.accent.toLowerCase());
                        hasContent = true;
                        content = page.find('> div[data-role="content"]').addClass('app-bootstrap app-content-desktop');
                        _app.configureFramework(framework, content);
                        page.css({ position: 'absolute', 'top': table.offset().top, width: '100%' });
                        table.hide();
                        page.find('a').each(function () {
                            var link = $(this),
                                href = link.attr('href'),
                                pageId = href && href.startsWith('#') && href.length > 1 && href.substring(1);
                            if (pageId && Array.indexOf(contentPages, pageId) !== -1)
                                link.attr('href', '?_hash=' + pageId);
                        });
                        $('#PageFooterBar').hide();
                        return;
                    }
                page.remove();
            });
            $(pc).find('div[data-role="placeholder"]').each(function () {
                var placeholder = $(this),
                    factory = _app._contentFactories[placeholder.attr('data-placeholder')];
                if (factory)
                    factory(placeholder);
            });
            //userPages.remove();
            var divs = document.body.getElementsByTagName('div');
            for (var i = 0; i < divs.length; i++) {
                if (divs[i].className.match(/Loading/)) {
                    Sys.UI.DomElement.removeCssClass(divs[i], 'Loading');
                    break;
                }
            }
            divs = pc.getElementsByTagName('div');
            var layoutContainers = [];
            var rowIndex = 0;
            var hasActivators = false;
            var hasSideBarActivators = false;
            var sb = null;
            var siteActions = [];
            _app._numberOfContainers = 0;
            var dataAttr = _app.prototype.dataAttr;
            for (i = 0; i < divs.length; i++) {
                var div = divs[i];
                var width = dataAttr(div, 'width');
                var flow = dataAttr(div, 'flow');
                if (!isNullOrEmpty(width) || !isNullOrEmpty(flow)) {
                    if ($(div).find('div[data-flow]').length)
                        continue;
                    if (flow !== 'NewColumn' && flow !== 'column') {
                        div.style.clear = 'left';
                        rowIndex++;
                    }
                    if (isNullOrEmpty(div.id))
                        div.id = "_lc" + layoutContainers.length;
                    Sys.UI.DomElement.addCssClass(div, 'LayoutContainer');
                    _app._numberOfContainers++;
                    if (width !== '100%')
                        div.style.overflow = 'hidden';
                    Array.add(layoutContainers, { 'id': div.id, 'width': width, 'rowIndex': rowIndex, 'peersWithoutWidth': 0 });
                    var childDivs = div.getElementsByTagName('div');
                    var divsWithActivator = [];
                    for (var j = 0; j < childDivs.length; j++) {
                        var childDiv = childDivs[j];
                        var activator = dataAttr(childDiv, 'activator');
                        if (!isNullOrEmpty(activator) && !isBlank(childDiv.innerHTML)) {
                            childDiv.id = isNullOrEmpty(childDiv.id) ? div.id + '$a' + j : childDiv.id;
                            var da = { 'elem': childDiv, 'activator': _app.eval(activator).split('|'), 'id': childDiv.id };
                            da.activator[0] = da.activator[0].trim();
                            if (da.activator.length === 1) da.activator[1] = j.toString();
                            Array.add(divsWithActivator, da);
                        }
                    }
                    j = 1;
                    while (j < divsWithActivator.length) {
                        da = divsWithActivator[j];
                        for (var k = 0; k < j; k++) {
                            var da2 = divsWithActivator[k];
                            if (da2.activator[0] == da.activator[0] & da2.activator[1] == da.activator[1]) {
                                while (da.elem.childNodes.length > 0)
                                    da2.elem.appendChild(da.elem.childNodes[0]);
                                delete da.elem;
                                Array.removeAt(divsWithActivator, j);
                                da = null;
                                break;
                            }
                        }
                        if (da) j++;
                    }
                    if (divsWithActivator.length > 0) {
                        hasActivators = true;
                        var nodes = [];
                        var firstSideBarActivator = true;
                        for (j = 0; j < divsWithActivator.length; j++) {
                            da = divsWithActivator[j];
                            if (da.activator[0] === 'Tab') {
                                if (!nodes.length) {
                                    var menuBar = document.createElement('div');
                                    menuBar.className = 'TabBar';
                                    div.insertBefore(menuBar, da.elem);
                                }
                                var n = { 'title': da.activator[1], 'elementId': da.id, 'selected': nodes.length == 0, 'description': dataAttr(da.elem, 'description'), 'hidden': dataAttr(da.elem, 'hidden') };
                                Array.add(nodes, n);
                                Sys.UI.DomElement.setVisible(da.elem, n.selected);
                                da.elem._activated = true;
                                Sys.UI.DomElement.addCssClass(da.elem, 'TabBody TabContainer');
                            }
                            else if (da.activator[0] === 'SideBarTask') {
                                if (!sb) {
                                    sb = new Sys.StringBuilder();
                                    sb.appendFormat('<div class="TaskBox TaskList"><div class="Inner"><div class="Header">{0}</div>', resources.Menu.Tasks);
                                }
                                da.elem._activated = firstSideBarActivator;
                                if (firstSideBarActivator) firstSideBarActivator = false;
                                Sys.UI.DomElement.setVisible(da.elem, da.elem._activated);
                                sb.appendFormat('<div class="Task{1}"{4}><a href="javascript:" onclick="$app._activate(this,\'{2}\',\'SideBarTask\');return false;" title=\'{3}\'>{0}</a></div>', da.activator[1], !hasSideBarActivators ? ' Selected' : '', da.id,
                                    _app.htmlAttributeEncode(dataAttr(da.elem, 'description')), dataAttr(da.elem, 'hidden') == 'true' ? ' style="display:none"' : '');
                                hasSideBarActivators = true;
                            }
                            else if (da.activator[0] === 'SiteAction' && Web.Menu.get_siteActionsFamily()) {
                                var item = new Web.Item(Web.Menu.get_siteActionsFamily(), da.activator[1], dataAttr(da.elem, 'description'));
                                item.set_cssClass(dataAttr(da.elem, 'cssClass'));
                                item.set_script('$app._activate(null,"{0}","SiteAction")', da.id);
                                Array.add(siteActions, item);
                                Sys.UI.DomElement.setVisible(da.elem, false);
                            }
                            else {
                                Sys.UI.DomElement.setVisible(da.elem, false);
                            }
                            da.elem = null;
                        }
                        if (nodes.length > 0) {
                            $create(Web.Menu, { 'id': div.id + '$ActivatorMenu', 'nodes': nodes }, null, null, menuBar);
                            if (nodes.length < 2 && !i)
                                Sys.UI.DomElement.addCssClass(menuBar, 'EmptyTabBar');
                        }
                    }
                }
            }
            if (hasActivators)
                _app._performDelayedLoading();
            if (hasSideBarActivators && sb) {
                var sideBar = $getSideBar();
                if (sideBar) {
                    sb.append('</div></div>');
                    var tasksBox = document.createElement('div');
                    tasksBox.innerHTML = sb.toString();
                    sb.clear();
                    sideBar.insertBefore(tasksBox, sideBar.childNodes[0]);
                    sideBar._hasActivators = true;
                }
            }
            if (siteActions.length > 0)
                Web.Menu.set_siteActions(siteActions);
            var ri = rowIndex;
            while (layoutContainers.length > 0 && ri >= layoutContainers[0].rowIndex) {
                var containersWithoutWidth = 0;
                var peerCount = 0;
                for (i = 0; i < layoutContainers.length; i++) {
                    lc = layoutContainers[i];
                    if (lc.rowIndex == ri) {
                        peerCount++;
                        if (isNullOrEmpty(lc.width))
                            containersWithoutWidth++;
                    }
                }
                for (i = 0; i < layoutContainers.length; i++) {
                    lc = layoutContainers[i];
                    if (lc.rowIndex === ri) {
                        lc.peersWithoutWidth = containersWithoutWidth;
                        if (peerCount === 1 && isNullOrEmpty(lc.width))
                            lc.width = '100%';
                    }
                }
                ri--;
            }
            _app._layoutContainers = layoutContainers;
            _body_performResize();
            $addHandler(window, 'resize', _body_resize);
            $addHandler(window, 'scroll', _body_scroll);
        }
        _app._startDelayedLoading();
        $addHandler(document.body, 'keydown', _body_keydown);
    };

    _app._unload = function () {
        if (this._state) {
            Array.clear(this._state);
            delete this._state;
        }
        if (_app._delayedLoadingTimer) {
            clearInterval(_app._delayedLoadingTimer);
            Array.clear(_app._delayedLoadingViews);
            delete _app._delayedLoadingViews;
        }
        if ($get('PageContent')) {
            $removeHandler(window, 'resize', _body_resize);
            $removeHandler(window, 'scroll', _body_scroll);
        }
        $removeHandler(document.body, 'keydown', _body_keydown);
    };

    _Sys_Application.add_init(function () {
        // override global variables and extend the prototype of Web.DataView class
        findDataView = _app.findDataView;
        isNullOrEmpty = String.isNullOrEmpty;
        isBlank = String.isBlank;
        for (var method in classicDataViewApi)
            Web.DataView.prototype[method] = classicDataViewApi[method];
        _wm = Web.Membership;
        if (_wm) {
            for (method in classicMembershipApi)
                Web.Membership.prototype[method] = classicMembershipApi[method];

            // Membership Manager

            Type.registerNamespace("Web");

            Web.MembershipManager = function (element) {
                Web.MembershipManager.initializeBase(this, [element]);
            };

            Web.MembershipManager.prototype = {
                get_servicePath: function () {
                    return this._servicePath;
                },
                set_servicePath: function set_servicePath(value) {
                    this._servicePath = value;
                },
                get_baseUrl: function () {
                    return this._baseUrl;
                },
                set_baseUrl: function (value) {
                    this._baseUrl = value;
                },
                initialize: function () {
                    Web.MembershipManager.callBaseMethod(this, 'initialize');
                },
                dispose: function () {
                    Web.MembershipManager.callBaseMethod(this, 'dispose');
                },
                updated: function () {
                    Web.MembershipManager.callBaseMethod(this, 'updated');
                    var elem = this.get_element(),
                        wmrm = Web.MembershipResources.Manager,
                        baseUrl = this.get_baseUrl();

                    if (_touch) {
                        $(String.format(
                            '<div data-flow="NewRow">' +
                            '<div data-activator="Tab|{0}">' +
                            '    <div id="membershipUsers"></div>' +
                            ' </div>' +
                            ' <div data-activator="Tab|{1}">' +
                            '    <div id="membershipRoles"></div>' +
                            '</div>' +
                            '<div data-activator="Tab|{2}">' +
                            '    <div id="membershipRoleUsers"></div>' +
                            '</div>' +
                            '</div>', wmrm.UsersTab, wmrm.RolesTab, wmrm.UsersInRole)).appendTo(elem);
                    }
                    else {
                        Sys.UI.DomElement.addCssClass(elem, 'MembershipManager');

                        var sb = new Sys.StringBuilder();
                        sb.append('<div class="TabContainer" id="MembershipManager1_SecurityTabs" style="visibility:hidden;">');
                        sb.append('<div id="MembershipManager1_SecurityTabs_header">');
                        sb.append(String.format('<span id="__tab_MembershipManager1_SecurityTabs_UsersTab">{0}</span><span id="__tab_MembershipManager1_SecurityTabs_RolesTab">{1}</span>', wmrm.UsersTab, wmrm.RolesTab));
                        sb.append('</div><div id="MembershipManager1_SecurityTabs_body">');
                        sb.append('<div id="MembershipManager1_SecurityTabs_UsersTab" style="display:none;visibility:hidden;">');
                        sb.append('<div id="MembershipManager1_SecurityTabs_UsersTab_Users"></div>');
                        sb.append('</div><div id="MembershipManager1_SecurityTabs_RolesTab" style="display:none;visibility:hidden;">');
                        sb.append('<div id="MembershipManager1_SecurityTabs_RolesTab_Roles"></div>');
                        sb.append('<div id="MembershipManager1_SecurityTabs_RolesTab_UsersInRoles" style="margin-top: 8px"></div>');
                        sb.append('</div>');
                        sb.append('</div>');
                        sb.append('</div>');
                        elem.innerHTML = sb.toString();

                    }
                    $create(Web.DataView, { "baseUrl": baseUrl, "controller": "aspnet_Membership", "id": "MembershipManager1_SecurityTabs_UsersTab_UsersExtender", "pageSize": 10, "servicePath": this.get_servicePath(), "showActionBar": true, "viewId": null, "showSearchBar": true, 'showFirstLetters': true, 'tags': 'multi-select-none' }, null, null, _touch ? $("#membershipUsers")[0] : $get("MembershipManager1_SecurityTabs_UsersTab_Users", elem));
                    if (!_touch)
                        $create(AjaxControlToolkit.TabPanel, { "headerTab": $get("__tab_MembershipManager1_SecurityTabs_UsersTab", elem) }, null, { "owner": "MembershipManager1_SecurityTabs" }, $get("MembershipManager1_SecurityTabs_UsersTab", elem));
                    $create(Web.DataView, { "baseUrl": baseUrl, "controller": "aspnet_Roles", "id": "MembershipManager1_SecurityTabs_RolesTab_RolesExtender", "pageSize": 5, "servicePath": this.get_servicePath(), "showActionBar": true, "viewId": null, "showSearchBar": true, 'tags': 'multi-select-none' }, null, null, _touch ? $("#membershipRoles")[0] : $get("MembershipManager1_SecurityTabs_RolesTab_Roles", elem));
                    $create(Web.DataView, { "baseUrl": baseUrl, "controller": "aspnet_Membership", "filterFields": "RoleId", "filterSource": "MembershipManager1_SecurityTabs_RolesTab_RolesExtender", "id": "MembershipManager1_SecurityTabs_RolesTab_UsersInRolesExtender", "pageSize": 5, "servicePath": this.get_servicePath(), "showActionBar": true, "viewId": "usersInRolesGrid", "autoHide": 1, "showSearchBar": true, 'showFirstLetters': true, 'tags': 'multi-select-none' }, null, null, _touch ? $("#membershipRoleUsers")[0] : $get("MembershipManager1_SecurityTabs_RolesTab_UsersInRoles", elem));
                    if (!_touch) {
                        $create(AjaxControlToolkit.TabPanel, { "headerTab": $get("__tab_MembershipManager1_SecurityTabs_RolesTab", elem) }, null, { "owner": "MembershipManager1_SecurityTabs" }, $get("MembershipManager1_SecurityTabs_RolesTab", elem));
                        $create(AjaxControlToolkit.TabContainer, { "activeTabIndex": 0, "clientStateField": $get("MembershipManager1_SecurityTabs_ClientState", elem) }, null, null, $get("MembershipManager1_SecurityTabs", elem));
                    }
                }
            };

            Web.MembershipManager.registerClass('Web.MembershipManager', Sys.UI.Behavior);

            if (Sys.Extended && typeof (AjaxControlToolkit) == "undefined") AjaxControlToolkit = Sys.Extended.UI;
        }
    });


    _Sys_Application.add_load(function () {
        _app._parse();
        $(document).trigger('start.app');
    });

    _Sys_Application.add_load(_app._load);
    _Sys_Application.add_unload(_app._unload);

    _window.updateACT = function () {
        if (Sys.Extended && typeof AjaxControlToolkit == "undefined") AjaxControlToolkit = Sys.Extended.UI;
        Web.AutoComplete.registerClass('Web.AutoComplete', AjaxControlToolkit.AutoCompleteBehavior);
        sysBrowser.WebKit = {};
        if (navigator.userAgent.indexOf('WebKit/') > -1) {
            sysBrowser.agent = sysBrowser.WebKit;
            sysBrowser.version = parseFloat(navigator.userAgent.match(/WebKit\/(\d+(\.\d+)?)/)[1]);
            sysBrowser.name = 'WebKit';
        }
        if (!(sysBrowser.agent == sysBrowser.InternetExplorer || sysBrowser.agent == sysBrowser.Firefox || sysBrowser.agent == sysBrowser.Opera) && !Sys.Extended) {
            $common.old_getBounds = $common.getBounds;
            $common.getBounds = function (element) {
                var bounds = $common.old_getBounds(element);
                var scrolling = _app.scrolling(); // $common.getScrolling();
                if (scrolling.y || scrolling.x) {
                    bounds.x += scrolling.x;
                    bounds.y += scrolling.y;
                }
                return bounds;
            };
        }
        var calendarBehavior = AjaxControlToolkit.CalendarBehavior;
        if (calendarBehavior && !calendarBehavior.prototype.old_show) {
            calendarBehavior.prototype.old_show = calendarBehavior.prototype.show;
            calendarBehavior.prototype.show = function () {
                this.old_show();
                //this._container.style.zIndex = 100100;
                var container = $(this._container).zIndex(100100),
                    elem = $(this._element),
                    showAbove = elem.parent().find('.Error:visible').length || elem.closest('div.Item').find('.Error:visible').length;
                function positionCalendar() {
                    container.position({ my: 'left ' + (showAbove ? 'bottom' : 'top'), at: 'left ' + (showAbove ? 'top' : 'bottom'), of: elem });
                }
                positionCalendar();
                setTimeout(positionCalendar, 10);
            };
            calendarBehavior.prototype.old_raiseDateSelectionChanged = calendarBehavior.prototype.raiseDateSelectionChanged;
            calendarBehavior.prototype.raiseDateSelectionChanged = function () {
                this.old_raiseDateSelectionChanged();
                this._element.focus();
            };
        }
        var tabContainer = AjaxControlToolkit.TabContainer;
        if (tabContainer && !tabContainer.prototype.old_set_activeTabIndex) {
            tabContainer.prototype.old_set_activeTabIndex = tabContainer.prototype.set_activeTabIndex;
            tabContainer.prototype.set_activeTabIndex = function (value) {
                var oldActiveTabIndex = this.get_activeTabIndex();
                if (!this._headerAssigned) {
                    this._headerAssigned = true;
                    Sys.UI.DomElement.addCssClass(this._element.getElementsByTagName('div')[0], 'tab-header');
                }
                this.old_set_activeTabIndex(value);
                if (value !== oldActiveTabIndex)
                    _body_performResize();
            };
        }
        var autoCompleteBehavior = AjaxControlToolkit.AutoCompleteBehavior;
        if (autoCompleteBehavior && !autoCompleteBehavior.prototype.old_dispose) {
            autoCompleteBehavior.prototype.old_dispose = autoCompleteBehavior.prototype.dispose;
            autoCompleteBehavior.prototype.dispose = function () {
                this.old_dispose();
                if (this._completionListElement) {
                    this._completionListElement.parentNode.removeChild(this._completionListElement);
                    delete this._completionListElement;
                }
            };
            autoCompleteBehavior.prototype.old__handleFlyoutFocus = autoCompleteBehavior.prototype._handleFlyoutFocus;
            autoCompleteBehavior.prototype._handleFlyoutFocus = function () {
                if (!this._completionListElement) return;
                this.old__handleFlyoutFocus();
            };
            autoCompleteBehavior.prototype.old_showPopup = autoCompleteBehavior.prototype.showPopup;
            autoCompleteBehavior.prototype.showPopup = function () {
                this.old_showPopup();
                if (Sys.UI.DomElement.getVisible(this._completionListElement)) {
                    var scrolling = _app.scrolling(); // $common.getScrolling();
                    this._completionListElement.style.height = '';
                    Sys.UI.DomElement.addCssClass(this._completionListElement, 'CompletionList');
                    this._completionListElement.style.width = '';
                    this._completionListElement.style.zIndex = 200100;
                    var cb = $common.getClientBounds();
                    var bounds = $common.getBounds(this._completionListElement);
                    if (bounds.width > cb.width / 3) bounds.width = cb.width / 3;
                    var elem = this._element;
                    if (Sys.UI.DomElement.containsCssClass(elem.parentNode, 'Input'))
                        while (!Sys.UI.DomElement.containsCssClass(elem.parentNode, 'AutoCompleteFrame'))
                            elem = elem.parentNode;
                    var elemBounds = $common.getBounds(elem);
                    var borderBox = $common.getBorderBox(this._completionListElement);
                    var paddingBox = $common.getPaddingBox(this._completionListElement);
                    if (bounds.width <= elemBounds.width)
                        this._completionListElement.style.width = (elemBounds.width - borderBox.horizontal - paddingBox.horizontal) + 'px';
                    bounds = $common.getBounds(this._completionListElement);
                    if (bounds.x !== elemBounds.x) {
                        bounds.x = elemBounds.x;
                        this._completionListElement.style.left = bounds.x + 'px';
                    }
                    if (bounds.y !== elemBounds.y) {
                        bounds.y = elemBounds.y + elemBounds.height - 1;
                        this._completionListElement.style.top = bounds.y + 'px';
                    }
                    if (bounds.x + bounds.width > cb.width)
                        this._completionListElement.style.left = (cb.width - bounds.width) + 'px';
                    bound = $common.getBounds(this._completionListElement);
                    var spaceAbove = elemBounds.y - scrolling.y;
                    var spaceBelow = cb.height - (elemBounds.y + elemBounds.height - scrolling.y);
                    if (bound.height <= spaceBelow || spaceBelow >= spaceAbove) {
                        if (bounds.y + bounds.height - scrolling.y > cb.height) {
                            this._completionListElement.style.height = (cb.height - (bounds.y - scrolling.y) - 4) + 'px';
                            this._completionListElement.style.overflow = 'auto';
                        }
                    }
                    else {
                        if (spaceAbove < bounds.height) {
                            this._completionListElement.style.top = (elemBounds.y - spaceAbove) + 'px';
                            this._completionListElement.style.height = spaceAbove + 'px';
                            this._completionListElement.style.overflow = 'auto';
                        }
                        else
                            this._completionListElement.style.top = (elemBounds.y - bounds.height + 3) + 'px';
                    }
                }
            };
            var modalPopupBehavior = AjaxControlToolkit.ModalPopupBehavior;
            if (modalPopupBehavior && !modalPopupBehavior.prototype.old__attachPopup) {
                modalPopupBehavior.prototype.old__attachPopup = modalPopupBehavior.prototype._attachPopup;
                modalPopupBehavior.prototype._attachPopup = function () {
                    this.old__attachPopup();
                    if (this._dropShadowBehavior /*&& __targetFramework != '3.5'*/) {
                        this._dropShadowBehavior.set_Width(4);
                        if (sysBrowser.agent != sysBrowser.InternetExplorer || sysBrowser.version >= 9)
                            this._dropShadowBehavior.set_Rounded(true);
                    }
                };
            }
        }
    };

    Sys.UI.DomElement.setFocus = function (element) {
        var sel = document.selection;
        if (sel && sel.type !== 'Text' && sel.type !== 'None')
            sel.clear();
        if (element) {
            element.focus();
            if (element.select)
                element.select();
            if (document.focus)
                document.focus();
        }
    };

    Sys.UI.DomElement.getCaretPosition = function (element) {
        var caretPos = 0;     // IE Support     
        if (document.selection) {
            element.focus();
            var sel = document.selection.createRange();
            sel.moveStart('character', -element.value.length);
            caretPos = sel.text.length;
        }     // Firefox support     
        else if (element.selectionStart || element.selectionStart === '0')
            caretPos = element.selectionStart;
        return caretPos;
    };

    Sys.UI.DomElement.setCaretPosition = function (element, pos) {
        if (element.setSelectionRange) {
            element.focus();
            element.setSelectionRange(pos, pos);
        }
        else if (element.createTextRange) {
            var range = element.createTextRange();
            range.collapse(true);
            range.moveEnd('character', pos);
            range.moveStart('character', pos);
            range.select();
        }
    };

    _web.AutoComplete = function (element) {
        Web.AutoComplete.initializeBase(this, [element]);
    };

    _web.AutoComplete.prototype = {
        initialize: function () {
            Web.AutoComplete.callBaseMethod(this, 'initialize');
            this._textBoxMouseOverHandler = Function.createDelegate(this, this._onTextBoxMouseOver);
            this._textBoxMouseOutHandler = Function.createDelegate(this, this._onTextBoxMouseOut);
            this._completionListItemCssClass = 'Item';
            this._highlightedItemCssClass = 'HighlightedItem';
        },
        dispose: function () {
            this._viewPage = null;
            if (this._element) {
                $removeHandler(this._element, 'mouseover', this._textBoxMouseOverHandler);
                $removeHandler(this._element, 'mouseout', this._textBoxMouseOutHandler);
            }
            Web.AutoComplete.callBaseMethod(this, 'dispose');
        },
        get_fieldName: function () {
            return this._fieldName;
        },
        set_fieldName: function (value) {
            this._fieldName = value;
        },
        updated: function () {
            var f = document.createElement('div');
            f.className = 'AutoCompleteFrame ' + this.get_typeCssClass();
            f.innerHTML = String.format('<table><tr><td class="Input"></td><td class="Clear" style="{2}"><span class="Clear" onclick="var e=this.parentNode.parentNode.getElementsByTagName(\'input\')[0];e.value=\'\';e.focus()" title="{1}">&nbsp;</span></td><td class="Button" onmouseover="if(!Sys.UI.DomElement.containsCssClass(this.parentNode, \'Active\'))$find(\'{0}\')._showDropDown(true)" onmouseout="$find(\'{0}\')._showDropDown(false)"><span class="Button" onclick="$find(\'{0}\')._showFullList();">&nbsp;</span></td></tr></table>', this.get_id(), labelClear, this.get_contextKey().match(/^(SearchBar|Filter)\:/) != null ? '' : 'display:none');
            this._element.setAttribute('autocomplete', 'off');
            this._element.parentNode.insertBefore(f, this._element);
            f.getElementsByTagName('td')[0].appendChild(this._element);
            if (sysBrowser.agent === sysBrowser.WebKit)
                f.style.marginLeft = '2px';
            if (this._completionSetCount === 10)
                this._completionSetCount = 100;
            $addHandler(this._element, 'mouseover', this._textBoxMouseOverHandler);
            $addHandler(this._element, 'mouseout', this._textBoxMouseOutHandler);
            Web.AutoComplete.callBaseMethod(this, 'updated');
            document.body.appendChild(this._completionListElement);
            this._completionListElement.className = 'CompletionList AutoComplete';
            this._completionListElement.style.display = 'none';
        },
        _showCachedFullList: function () {
            this._update('%', this._cache['%'], false);
        },
        _showFullList: function () {
            if (this._webRequest) return;
            var visible = this._popupBehavior.get_visible();
            this._hideCompletionList();
            this._element.focus();
            if (visible) return;
            this._completionWord = '%';
            if (this._cache && this._cache['%']) {
                var self = this;
                setTimeout(function () {
                    self._showCachedFullList();
                }, 50);
                return;
            }
            var params = { prefixText: this._completionWord, count: this._completionSetCount };
            if (this._useContextKey) params.contextKey = this._contextKey;
            this._ignoreCompletionWord = true;
            this._invoke(params, this._completionWord);
        },
        _showDropDown: function (show) {
            var e = this._element;
            while (e.tagName != 'TR')
                e = e.parentNode;
            if (show)
                Sys.UI.DomElement.addCssClass(e, 'Active');
            else if (this._textBoxHasFocus)
                Sys.UI.DomElement.addCssClass(e, 'Active');
            else
                Sys.UI.DomElement.removeCssClass(e, 'Active');
        },
        _onKeyDown: function (ev) {
            if (ev.keyCode == Sys.UI.Key.down && ev.altKey) {
                ev.preventDefault();
                ev.stopPropagation();
                this._showFullList();
            }
            var popupVisible = this._popupBehavior._visible;
            Web.AutoComplete.callBaseMethod(this, '_onKeyDown', [ev]);
            if (ev.keyCode == Sys.UI.Key.enter || ev.keyCode == Sys.UI.Key.esc) {
                var dataView = this._get_fieldDataView(true);
                if (dataView)
                    if (dataView.get_isDataSheet() && popupVisible) {
                        ev.preventDefault();
                        ev.stopPropagation();
                    }
                    else if (dataView.get_searchBarIsVisible()) {
                        ev.preventDefault();
                        ev.stopPropagation();
                        if (!popupVisible)
                            setTimeout(function () {
                                dataView._performSearch();
                            }, 100);
                    }
            }
        },
        _update: function (prefixText, completionItems, cacheResults) {
            Web.AutoComplete.callBaseMethod(this, '_update', [prefixText, completionItems, cacheResults]);
            if (completionItems) {
                var index = -1;
                var w = this._currentCompletionWord().toLowerCase();
                for (var i = 0; i < completionItems.length; i++) {
                    var s = completionItems[i];
                    if (s != null) {
                        s = s.toLowerCase();
                        if (index == -1 && s.startsWith(w))
                            index = i;
                        if (s == w) {
                            index = i;
                            break;
                        }
                    }
                }
                //var index = Array.indexOf(completionItems, this._currentCompletionWord());
                if (index >= 0 && index < this._completionListElement.childNodes.length) {
                    this._selectIndex = index;
                    w = this._completionListElement.childNodes[index];
                    this._highlightItem(w);
                    this._handleScroll(w, index + 5);
                }
            }
        },
        _get_fieldDataView: function (allTypes) {
            var dataView = null;
            var info = this._get_contextInfo();
            if (info && (info.type == 'Field' || allTypes && info.type == 'SearchBar'))
                dataView = _app.find(info.controller);
            return dataView;
        },
        _setText: function (item) {
            Web.AutoComplete.callBaseMethod(this, '_setText', [item]);
            this._updateClearButton();
            //var info = this._get_contextInfo();
            var dataView = this._get_fieldDataView();
            if (dataView/*info && info.type == 'Field'*/) {
                //var dataView = _app.find(info.controller);
                var field = dataView.findField(this.get_fieldName());
                var w = this.get_element().value;
                var values = [];
                if (w != labelNullValueInForms) {
                    var index = this._enumerateViewPageItems(w);
                    if (index != -1) {
                        var page = this._viewPage;
                        var r = page.Rows[index];
                        var valueFields = [];
                        for (var i = 0; i < page.Fields.length; i++) {
                            var f = page.Fields[i];
                            if (f.Name == field.ItemsDataValueField)
                                Array.add(valueFields, f);
                        }
                        if (valueFields.length == 0)
                            for (i = 0; i < page.Fields.length; i++) {
                                f = page.Fields[i];
                                if (f.IsPrimaryKey) {
                                    Array.add(valueFields, f);
                                    break;
                                }
                            }
                        for (i = 0; i < valueFields.length; i++) {
                            var v = r[valueFields[0].Index]
                            Array.add(values, v);
                        }
                    }
                }
                $get(dataView.get_id() + '_Item' + field.Index).value = values.toString();
                this._originalElementText = this.get_element().value;
                if (this._get_isInLookupMode()) {
                    if (!isNullOrEmpty(field.Copy)) {
                        values = [];
                        var iterator = /(\w+)=(\w+)/g;
                        var m = iterator.exec(field.Copy);
                        while (m) {
                            if (m[2] == 'null')
                                Array.add(values, { 'name': m[1], 'value': null });
                            else
                                for (i = 0; i < page.Fields.length; i++) {
                                    if (page.Fields[i].Name == m[2])
                                        Array.add(values, { 'name': m[1], 'value': r[i] });
                                }
                            m = iterator.exec(field.Copy);
                        }
                        dataView.refresh(true, values);
                    }
                    dataView._valueChanged(field.Index);
                }
            }
        },
        _get_isInLookupMode: function () {
            var info = this._get_contextInfo();
            return info != null && info.type == 'Field';
        },
        _updateClearButton: function () {
            var tr = this._element.parentNode.parentNode;
            if (!isBlank(this._element.value))
                Sys.UI.DomElement.addCssClass(tr, 'Filtered');
            else
                Sys.UI.DomElement.removeCssClass(tr, 'Filtered');
        },
        _onGotFocus: function (ev) {
            Web.AutoComplete.callBaseMethod(this, '_onGotFocus', [ev]);
            this._showDropDown(true);
            this._updateClearButton();
            if (this._get_isInLookupMode()) {
                var elem = this.get_element();
                this._originalElementText = elem.value;
                if (this._originalElementText == labelNullValueInForms) {
                    elem.value = '';
                    elem.select();
                }
            }
        },
        _onLostFocus: function (ev) {
            Web.AutoComplete.callBaseMethod(this, '_onLostFocus', [ev]);
            this._showDropDown(false);
            this._updateClearButton();
            if (this._get_isInLookupMode() && this._originalElementText != null)
                this.get_element().value = this._originalElementText;
        },
        _onTextBoxMouseOver: function (ev) {
            this._showDropDown(true);
        },
        _onTextBoxMouseOut: function (ev) {
            this._showDropDown(false);
        },
        _currentCompletionWord: function () {
            if (this._completionWord) {
                var w = this._completionWord;
                this._completionWord = null;
                return w;
            }
            return Web.AutoComplete.callBaseMethod(this, '_currentCompletionWord');
        },
        _onTimerTick: function (sender, eventArgs) {
            // turn off the timer until another key is pressed.
            this._timer.set_enabled(false);
            if (this._servicePath && this._serviceMethod) {
                var text = this._currentCompletionWord();

                if (text.trim().length < this._minimumPrefixLength) {
                    this._currentPrefix = null;
                    this._update('', null, /* cacheResults */false);
                    return;
                }
                // there is new content in the textbox or the textbox is empty but the min prefix length is 0
                if ((this._currentPrefix !== text) || ((text == "") && (this._minimumPrefixLength == 0))) {
                    this._currentPrefix = text;
                    if ((text != "") && this._cache && this._cache[text]) {
                        this._update(text, this._cache[text], /* cacheResults */false);
                        return;
                    }
                    // Raise the populating event and optionally cancel the web service invocation
                    eventArgs = new Sys.CancelEventArgs();
                    this.raisePopulating(eventArgs);
                    if (eventArgs.get_cancel()) {
                        return;
                    }

                    // Create the service parameters and optionally add the context parameter
                    // (thereby determining which method signature we're expecting...)
                    var params = { prefixText: this._currentPrefix, count: this._completionSetCount };
                    if (this._useContextKey) {
                        params.contextKey = this._contextKey;
                    }

                    if (this._webRequest) {
                        // abort the previous web service call if we 
                        // are issuing a new one and the previous one is 
                        // active.
                        this._webRequest.get_executor().abort();
                        this._webRequest = null;
                    }
                    // Invoke the web service
                    this._invoke(params, text);
                    $common.updateFormToRefreshATDeviceBuffer();
                }
            }
        },
        _get_contextInfo: function () {
            var m = this.get_contextKey().match(/^(\w+)\:(\w+),(\w+)$/);
            return m ? { 'type': m[1], 'controller': m[2], 'fieldName': m[3] } : null;
        },
        _invoke: function (params, text) {
            var that = this,
                info = that._get_contextInfo();
            if (info) {
                var dataView = _app.find(info.controller);
                var filter = [];
                var searchFieldName = info.fieldName;
                var operation = 'beginswith';
                if (info.type == 'SearchBar')
                    filter = dataView._createSearchBarFilter(true);
                else if (info.type == 'Filter')
                    filter = dataView.get_filter();
                else {
                    var field = dataView.findField(this.get_fieldName());
                    searchFieldName = !isNullOrEmpty(field.ItemsDataTextField) ? field.ItemsDataTextField : field.Name;
                }
                if (!this._ignoreCompletionWord) {
                    for (var i = 0; i < filter.length; i++) {
                        var fm = filter[i].match(/^(\w+):/);
                        if (fm[1] == info.fieldName) {
                            Array.removeAt(filter, i);
                            break;
                        }
                    }
                    if (!field)
                        field = dataView.findField(searchFieldName);
                    if (field && field.AutoCompleteAnywhere)
                        operation = 'contains';
                    Array.add(filter, String.format('{0}:${1}${2}\0', searchFieldName, operation, this._currentCompletionWord()));
                }
                var r = null,
                    sourceController = null,
                    sourceView = null,
                    fieldFilter, copyInfo, copyIterator;
                if (info.type == 'Field') {
                    sourceController = field.ItemsDataController;
                    sourceView = field.ItemsDataView || 'grid1';
                    fieldFilter = [field.ItemsDataTextField];
                    if (field.Copy)
                        while (copyInfo = _app._fieldMapRegex.exec(field.Copy))
                            fieldFilter.push(copyInfo[2]);
                    var lc = { 'FieldName': field.Name, 'Controller': dataView.get_controller(), 'View': dataView.get_viewId() };
                    var contextFilter = dataView.get_contextFilter(field);
                    for (i = 0; i < contextFilter.length; i++) {
                        var cfv = contextFilter[i];
                        Array.add(filter, String.format('{0}:={1}\0', cfv.Name, cfv.Value));
                    }
                    r = {
                        PageIndex: 0,
                        RequiresMetaData: true,
                        RequiresRowCount: false,
                        PageSize: 300,
                        FieldFilter: fieldFilter,
                        SortExpression: field.ItemsDataTextField,
                        Filter: filter,
                        ContextKey: dataView.get_id(),
                        //Cookie: dataView.get_cookie(),
                        FilterIsExternal: contextFilter.length > 0,
                        //Transaction: dataView.get_transaction(),
                        LookupContextFieldName: lc ? lc.FieldName : null,
                        LookupContextController: lc ? lc.Controller : null,
                        LookupContextView: lc ? lc.View : null,
                        LookupContext: lc,
                        View: dataView.get_viewId(),
                        Tag: dataView.get_tag(),
                        MetadataFilter: ['fields'],
                        ExternalFilter: contextFilter
                    };
                }
                else {
                    sourceController = dataView.get_controller();
                    sourceView = dataView.get_viewId();
                    r = {
                        FieldName: info.fieldName,
                        Filter: /*filter.length == 1 && filter[0].match(/(\w+):/)[1] == m[3] ? null : */filter,
                        LookupContextFieldName: lc ? lc.FieldName : null,
                        LookupContextController: lc ? lc.Controller : null,
                        LookupContextView: lc ? lc.View : null,
                        AllowFieldInFilter: this._ignoreCompletionWord != true,
                        Controller: sourceController,
                        View: sourceView,
                        Tag: dataView.get_tag(),
                        ExternalFilter: dataView.get_externalFilter()
                    };
                }
                dataView._busy(true);
                that._webRequest = dataView._invoke(that.get_serviceMethod(), { controller: sourceController, view: sourceView, request: r },
                    function (result, context) {
                        if (info.type == 'Field') {
                            dataView._busy(false);
                            that._onGetPageComplete(result, context);
                        }
                        else {
                            dataView._busy(false);
                            that._onGetListOfValuesComplete(result, context);
                        }
                    },
                    text);
                that._ignoreCompletionWord = false;
            }
            else
                that._webRequest = Sys.Net.WebServiceProxy.invoke(that.get_servicePath(), that.get_serviceMethod(), false, params,
                    Function.createDelegate(that, that._onMethodComplete),
                    Function.createDelegate(that, that._onMethodFailed),
                    text);
        },
        _onGetListOfValuesComplete: function (result, context) {
            if (result.length > 0 && result[0] == null)
                result[0] = resourcesHeaderFilter.EmptyValue;
            this._webRequest = null; // clear out our saved WebRequest object    
            this._update(context, result, /* cacheResults */true);
        },
        _onGetPageComplete: function (result, context) {
            if (!this._element) return;
            this._viewPage = result;
            var listOfValues = this._enumerateViewPageItems();
            this._onGetListOfValuesComplete(listOfValues, context);
        },
        _enumerateViewPageItems: function (matchText) {
            var page = this._viewPage;
            //var info = this._get_contextInfo();
            //var dataView = _app.find(info.controller);
            var dataView = this._get_fieldDataView();
            var field = dataView.findField(this.get_fieldName());
            var textFields = [];
            for (var i = 0; i < page.Fields.length; i++) {
                var f = page.Fields[i];
                f.Index = i;
                if (!f.Type)
                    f.Type === 'String';
                if (f.Name === field.ItemsDataTextField)
                    Array.add(textFields, f);
            }
            if (!textFields.length)
                for (i = 0; i < page.Fields.length; i++) {
                    f = page.Fields[i];
                    if (!f.Hidden && f.Type === 'String') {
                        Array.add(textFields, f);
                        break;
                    }
                }
            if (!textFields.length)
                for (i = 0; i < page.Fields.length; i++) {
                    f = page.Fields[i];
                    if (!f.Hidden) {
                        Array.add(textFields, f);
                        break;
                    }
                }
            var listOfValues = [];
            if (field.AllowNulls)
                Array.add(listOfValues, labelNullValueInForms);
            for (i = 0; i < page.Rows.length; i++) {
                var v = page.Rows[i][textFields[0].Index];
                if (matchText != null) {
                    if (v === matchText)
                        return i;
                }
                else
                    Array.add(listOfValues, v);
            }
            return matchText != null ? -1 : listOfValues;
        },
        get_typeCssClass: function () {
            return this._typeCssClass;
        },
        set_typeCssClass: function (value) {
            this._typeCssClass = value;
        }
    };

    _app.borderBox = function (elem) {
        var $elem = $(elem);
        //var borderTop = $elem.css('border-top-width');
        //var borderBottom = $elem.css('border-bottom-width');
        return { horizontal: $elem.outerWidth() - $elem.innerWidth(), vertical: $elem.outerHeight() - $elem.innerHeight() };
    };

    _app.paddingBox = function (elem) {
        var $elem = $(elem);
        return { horizontal: $elem.innerWidth() - $elem.width(), vertical: $elem.innerHeight() - $elem.height() };
    };

    _app.marginBox = function (elem) {
        var $elem = $(elem);
        return { horizontal: $elem.outerWidth(true) - $elem.outerWidth(), vertical: $elem.outerHeight(true) - $elem.outerHeight() };
    };

    _app.bounds = function (elem) {
        var $elem = $(elem);
        var offset = $elem.offset();
        return { x: offset.left, y: offset.top, width: $elem.outerWidth(), height: $elem.outerHeight() };
    };

    _app.scrolling = function () {
        return { x: $window.scrollLeft(), y: $window.scrollTop() };
    };

    _app.clientBounds = function () {
        return { width: $window.width(), height: $window.height() };
    };


    _window._body_hideLayoutContainers = function () {
        if (!_app._layoutContainers) return;
        for (var i = 0; i < _app._layoutContainers.length; i++) {
            var lc = _app._layoutContainers[i];
            if (lc.width != '100%')
                Sys.UI.DomElement.setVisible($get(lc.id), false);
        }
    };

    _window._body_resizeLayoutContainers = function () {
        var layoutContainers = _app._layoutContainers;
        if (!layoutContainers || layoutContainers.length == 0) return;
        var pc = $get('PageContent');
        if (!pc) return;
        //var bounds = $common.getBounds(pc);
        var bounds = _app.bounds(pc);
        var padding = _app.paddingBox(pc);
        //var padding2 = $common.getPaddingBox(pc);
        var border = _app.borderBox(pc);
        //var border2 = $common.getBorderBox(pc);
        var margin = _app.marginBox(pc); // $common.getMarginBox(pc);
        //var margin2 = $common.getMarginBox(pc);
        bounds.width -= padding.horizontal + border.horizontal + margin.horizontal;
        var rowIndex = layoutContainers[layoutContainers.length - 1].rowIndex;
        while (rowIndex >= layoutContainers[0].rowIndex) {
            var usedSpace = 0;
            for (var i = 0; i < layoutContainers.length; i++) {
                var lc = layoutContainers[i];
                if (lc.rowIndex == rowIndex && !isNullOrEmpty(lc.width)) {
                    var div = $get(lc.id);
                    if (div) {
                        var divPadding = _app.paddingBox(div); // $common.getPaddingBox(div);
                        var divBorder = _app.borderBox(div); // $common.getBorderBox(div);
                        var divMargin = _app.marginBox(div); // $common.getMarginBox(div);
                        var m = lc.width.match(/(\d+)(%|px|)/);
                        var divWidth = m[2] != '%' ? parseFloat(m[1]) : Math.floor(bounds.width * parseFloat(m[1]) / 100);
                        usedSpace += divWidth;
                        divWidth -= divPadding.horizontal + divBorder.horizontal + divMargin.horizontal
                        if (lc.width != '100%') {
                            div.style.width = divWidth + 'px';
                            Sys.UI.DomElement.setVisible(div, true);
                        }
                        else {
                            $(div).removeClass('LayoutContainer').addClass('RowContainer');
                        }
                    }
                }
            }
            if (usedSpace < bounds.width) {
                for (i = 0; i < layoutContainers.length; i++) {
                    lc = layoutContainers[i];
                    if (lc.rowIndex == rowIndex && isNullOrEmpty(lc.width)) {
                        div = $get(lc.id);
                        if (div) {
                            divPadding = _app.paddingBox(div); // $common.getPaddingBox(div);
                            divBorder = _app.borderBox(div); // $common.getBorderBox(div);
                            divMargin = _app.marginBox(div); // $common.getMarginBox(div);
                            divWidth = Math.floor((bounds.width - usedSpace) / lc.peersWithoutWidth);
                            divWidth -= divPadding.horizontal + divBorder.horizontal + divMargin.horizontal
                            if (divWidth < 1) divWidth = 1;
                            div.style.width = divWidth + 'px';
                            Sys.UI.DomElement.setVisible(div, true);
                        }
                    }
                }
            }
            rowIndex--;
        }
    };

    _window._body_keydown = function (e) {
        if (e.keyCode == Sys.UI.Key.enter && _app._focusedItemIndex != null) {
            var dv = $find(_app._focusedDataViewId);
            if (dv && dv._get_focusedCell())
                return;
            var elem = $get(_app._focusedDataViewId + '_Item' + _app._focusedItemIndex);
            if (elem && elem.tagName == 'INPUT' && elem.type == 'text' && elem == e.target) {
                e.preventDefault();
                e.stopPropagation();
                dv = $find(_app._focusedDataViewId);
                if (dv) dv._valueChanged(_app._focusedItemIndex);
            }
        }
    };

    _window._body_resize = function () {
        if ($getSideBar())
            $('body,.MembershipBarPlaceholder').width('');
        if (_app._resizeInterval)
            clearInterval(_app._resizeInterval);
        if (!_app._resizing && !_app._resized) {
            _app._resizeInterval = setInterval(function () {
                _body_hideLayoutContainers();
                _body_resizeLayoutContainers();
                _body_performResize();
            }, 200);
        }
        else
            $closeHovers();
        _app._resized = false;
    };

    _window._body_scroll = function () {
        var sideBar = $getSideBar();
        if (!sideBar) return;
        var scrolling = _app.scrolling(); // { x: $(window).scrollLeft(), y: $(window).scrollTop() };// $common.getScrolling();
        var clientBounds = $common.getClientBounds();
        var bounds = $common.getBounds(sideBar);
        if (sideBar._originalTop == null)
            sideBar._originalTop = bounds.y;
        var originalTop = sideBar._originalTop;
        var deltaY = 0;
        if (_app.MessageBar) {
            var mbb = $common.getBounds(_app.MessageBar._element);
            originalTop += deltaY = mbb.height;
        }
        if (scrolling.y > sideBar._originalTop && bounds.height + 4 <= clientBounds.height && scrolling.x == 0) {
            sideBar.style.width = bounds.width + 'px';
            if (sysBrowser.agent == sysBrowser.InternetExplorer && sysBrowser.version <= 6) {
                sideBar.style.top = (4 + scrolling.y + deltaY) + 'px';
                sideBar.style.position = 'absolute';
            }
            else {
                sideBar.style.top = 4 + deltaY + 'px';
                sideBar.style.position = 'fixed';
            }
        }
        else {
            sideBar.style.top = '';
            sideBar.style.width = '';
            sideBar.style.position = '';
        }
        $('body,.MembershipBarPlaceholder').width($('table#PageBody').outerWidth());
    };

    _window._body_createPageContext = function (persist) {
        var pc = $get('PageContent');
        if (!pc) return;
        var b = $common.getBounds(pc);
        var pb = $common.getPaddingBox(pc);
        var bb = $common.getBorderBox(pc);
        var ctx = { 'height': b.height - pb.vertical - bb.vertical, 'scrolling': _app.scrolling()/* $common.getScrolling()*/ };
        if (persist != false) _app._pageContext = ctx;
        return ctx;
    };

    _window._body_performResize = function () {
        if (_app._resizeInterval) clearInterval(_app._resizeInterval);
        _app._resizeInterval = null;
        $closeHovers();
        var pc = $get('PageContent');
        if (!pc || _touch) return;

        var cb = $common.getClientBounds();
        var clientBounds = $common.getClientBounds();
        if (_app.MessageBar) {
            var messageBarElement = _app.MessageBar._element;
            if ($common.getVisible(messageBarElement)) {

                var mbeb = $common.getPaddingBox(messageBarElement);
                messageBarElement.style.width = (clientBounds.width - mbeb.horizontal) + 'px';
                var messageContainer = messageBarElement.childNodes[0];
                messageContainer.style.height = '';
                var panelBounds = $common.getBounds(messageContainer);
                var maxMessageHeight = Math.ceil(cb.height * 0.15)
                if (panelBounds.height > maxMessageHeight) {
                    messageContainer.style.height = maxMessageHeight + 'px';
                    messageContainer.style.overflow = 'auto';
                }
                mbeb = Sys.UI.DomElement.getBounds(messageBarElement);
                var bodyTop = _app.OriginalBodyTopOffset + mbeb.height;
                document.body.style.paddingTop = bodyTop + 'px';
                var loginDialog = $get("Membership_Login");
                if (loginDialog) loginDialog.style.marginTop = (bodyTop) + 'px';
            }
        }
        _app._resizing = true;
        var pageContext = _app._pageContext;
        if (pageContext == null)
            pageContext = _body_createPageContext(false);
        else
            _app._pageContext = null;
        var scrolling = _app.scrolling(); // $common.getScrolling();
        if (scrolling.y == 0) pc.style.height = '10px';
        _body_resizeLayoutContainers();
        //_body_scroll();
        if (typeof __cothost == 'undefined') {
            var bounds = _app.bounds(pc); // $common.getBounds(pc);
            var padding = _app.paddingBox(pc); // $common.getPaddingBox(pc);
            var border = _app.borderBox(pc); // $common.getBorderBox(pc);
            var pmb = Web.Menu.MainMenuElemId ? $get(Web.Menu.MainMenuElemId) : null;
            var pmbBorderBox = pmb ? $common.getBorderBox(pmb) : null;
            var pfc = $get('PageFooterContent');
            var pfb = $get('PageFooterBar');
            var newHeight = scrolling.y + cb.height - bounds.y - (pfb ? pfb.offsetHeight : 0) - (pfc ? pfc.offsetHeight : 0) - border.vertical - padding.vertical - (pmbBorderBox ? pmbBorderBox.vertical : 0);
            if (bounds.height < newHeight) {
                if (sysBrowser.agent == sysBrowser.Opera)
                    newHeight += border.vertical + padding.vertical;
            }
            if (!pageContext.scrolling.y || _app._numberOfContainers < 2)
                pc.style.height = document.body.offsetHeight > cb.height ? '' : newHeight + 'px';
            else {
                pc.style.height = pageContext.height + 'px';
                scrollTo(0, pageContext.scrolling.y);
            }
        }
        _body_scroll();
        _app._resizing = false;
        _app._resized = true;
    };

    _app._activate = function (source, elementId, type) {
        var activatorRegex = new RegExp('^\\s*' + type + '\\s*\\|');
        var elem = $get(elementId);
        if (type === 'SideBarTask') {
            var lc = elem;
            while (lc && isNullOrEmpty(this.prototype.dataAttr(lc, 'flow')))
                lc = lc.parentNode;
            var peers = lc.getElementsByTagName('div');
            for (var i = 0; i < peers.length; i++) {
                var activator = this.prototype.dataAttr(peers[i], 'activator');
                if (!isNullOrEmpty(activator) && activatorRegex.exec(activator))
                    $(peers[i]).hide();
            }
        }
        Sys.UI.DomElement.setVisible(elem, type === 'SideBarTask' ? true : !Sys.UI.DomElement.getVisible(elem));
        elem._activated = true;
        if (type === 'SiteAction' && elem.childNodes[0].className !== 'CloseSiteAction') {
            var closeLink = document.createElement('div');
            closeLink.className = 'CloseSiteAction';
            closeLink.innerHTML = String.format('<a href="javascript:" onclick="$app._activate(null,\'{0}\',\'SiteAction\')">{1}</a>', elementId, resourcesModalPopup.Close);
            elem.insertBefore(closeLink, elem.childNodes[0]);
        }
        if (Sys.UI.DomElement.getVisible(elem)) {
            var bounds = $common.getBounds(elem);
            var clientBounds = $common.getClientBounds();
            var scrolling = _app.scrolling(); // $common.getScrolling();
            if (bounds.y < scrolling.y || bounds.y > scrolling.y + clientBounds.height)
                elem.scrollIntoView(false);
        }
        if (source) {
            while (source && !Sys.UI.DomElement.containsCssClass(source, 'Task'))
                source = source.parentNode;
            for (i = 0; i < source.parentNode.childNodes.length; i++) {
                var peer = source.parentNode.childNodes[i];
                if (peer.className)
                    Sys.UI.DomElement.removeCssClass(peer, 'Selected');
            }
            Sys.UI.DomElement.addCssClass(source, 'Selected');
        }
        _body_performResize();
    };

    _app._partialUpdateBeginRequest = function (sender, args) {
        var r = args.get_request();
        var components = _Sys_Application.getComponents();
        var controllers = [];
        for (var i = 0; i < components.length; i++) {
            var c = components[i];
            if (c._controller && c._viewId && isInstanceOfType(_app, c)) {
                var tag = c.get_tag();
                if (!isNullOrEmpty(tag)) {
                    Array.add(controllers, tag);
                    Array.add(controllers, c.get_selectedKey());
                }
            }
        }
        var s = serialize(controllers);
        r.set_body(r.get_body() + '&' + encodeURIComponent('__WEB_DATAVIEWSTATE') + '=' + encodeURIComponent(s));
    };

    _app._updateBatchSelectStatus = function (cb, isForm) {
        var targetClass = isForm ? 'Item' : 'Cell';
        var elem = cb.parentNode;
        while (elem != null && !Sys.UI.DomElement.containsCssClass(elem, targetClass)) elem = elem.parentNode;
        if (elem) {
            if (cb.checked)
                Sys.UI.DomElement.addCssClass(elem, 'BatchEditFrame');
            else
                Sys.UI.DomElement.removeCssClass(elem, 'BatchEditFrame');
        }
    };

    _app.highlightFilterValues = function (elem, active, className) {
        while (elem && elem.tagName !== 'TABLE')
            elem = elem.parentNode;
        if (elem)
            if (active && !elem.className.match(className))
                Sys.UI.DomElement.addCssClass(elem, className);
            else if (!active && elem.className.match(className))
                Sys.UI.DomElement.removeCssClass(elem, className);
    };

    _window.$hoverTab = function (elem, active) {
        while (elem && elem.tagName !== 'TD')
            elem = elem.parentNode;
        if (elem) {
            if (active) {
                Sys.UI.DomElement.addCssClass(elem, 'Active');
                elem.focus();
            }
            else
                Sys.UI.DomElement.removeCssClass(elem, 'Active');
        }
    };

    _window.$getSideBar = function () {
        var sideBar = $get('PageContentSideBar');
        if (!sideBar) return null;
        for (var i = 0; i < sideBar.childNodes.length; i++) {
            var n = sideBar.childNodes[i];
            if (n.className === 'SideBarBody') return n;
        }
        return null;
    };

    _window.$dvget = function (controller, view, fieldName, containerOnly) {
        var list = _Sys_Application.getComponents();
        var cid = '_' + controller;
        var dataView = null;
        for (var i = 0; i < list.length; i++) {
            var c = list[i];
            if (c._id === controller || isInstanceOfType(_app, c) && (c._id.endsWith(cid) || c._controller === controller && (!view || c.get_viewId() === view))) {
                dataView = c;
                break;
            }
        }
        if (dataView) {
            if (fieldName) {
                var field = dataView.findField(fieldName);
                if (field) {
                    if (containerOnly) {
                        element = $get(dataView._id + '_ItemContainer' + field.Index);
                        if (element)
                            for (i = 0; i < element.childNodes.length; i++) {
                                var velem = element.childNodes[i];
                                if (velem.className === 'Value')
                                    return velem;
                            }
                    } else
                        return $get(dataView._id + '_Item' + field.Index);
                    return element;
                }
                else
                    return null;
            }
            else
                return dataView;
        }
        return null;
    };

    _window.Web$DataView$RichText = function () { };
    _window.Web$DataView$RichText.prototype = {
        attach: function (element, viewType) {
            var $element = $(element);
            $element.addClass('dataview-rich-text');
            var lang = $('html').attr('lang');
            if (isNullOrEmpty(lang))
                lang = $('html').attr('xml:lang');
            if (typeof CKEDITOR != 'undefined') {
                $('<div></div>').insertAfter($element).width($element.outerWidth()).height(1);
                CKEDITOR.replace(element.id, {
                    language: lang,
                    on:
                    {
                        instanceReady: function (ev) {
                            var originalMaximize = CKEDITOR.instances[element.id].getCommand('maximize');
                            if (originalMaximize) {
                                originalMaximize._old_exec = originalMaximize.exec;
                                originalMaximize.exec = function (editor) {
                                    this._old_exec(editor);
                                    $(ev.editor.container.$).find('.cke_maximized').css('z-index', 10001);
                                }
                            }
                        }
                    }
                });
            }
            else {
                var editorResources = resources.Editor;
                var buttons = [
                    { CommandName: 'Undo', Tooltip: editorResources.Undo },
                    { CommandName: 'Redo', Tooltip: editorResources.Redo },
                    { CommandName: 'Bold', Tooltip: editorResources.Bold, ElementWhiteList: { b: ['style'], strong: ['style'] } },
                    { CommandName: 'Italic', Tooltip: editorResources.Italic, ElementWhiteList: { i: ['style'], em: ['style'] } },
                    { CommandName: 'Underline', Tooltip: editorResources.Underline, ElementWhiteList: { u: ['style'] } },
                    { CommandName: 'StrikeThrough', Tooltip: editorResources.Strikethrough, ElementWhiteList: { strike: ['style'] } },
                    { CommandName: 'Subscript', Tooltip: editorResources.Subscript, ElementWhiteList: { sub: ['style'] } },
                    { CommandName: 'Superscript', Tooltip: editorResources.Superscript, ElementWhiteList: { sup: ['style'] } },

                    { CommandName: 'JustifyLeft', Tooltip: editorResources.JustifyLeft, ElementWhiteList: { p: ['align'], div: ['style', 'align'] }, AttributeWhiteList: { style: ['text-align'] }, align: ['left'] },
                    { CommandName: 'JustifyCenter', Tooltip: editorResources.JustifyCenter, ElementWhiteList: { p: ['align'], div: ['style', 'align'] }, AttributeWhiteList: { style: ['text-align'] }, align: ['center'] },
                    { CommandName: 'JustifyRight', Tooltip: editorResources.JustifyRight, ElementWhiteList: { p: ['align'], div: ['style', 'align'] }, AttributeWhiteList: { style: ['text-align'] }, align: ['right'] },
                    { CommandName: 'JustifyFull', Tooltip: editorResources.JustifyFull, ElementWhiteList: { p: ['align'], div: ['style', 'align'] }, AttributeWhiteList: { style: ['text-align'] }, align: ['justify'] },

                    { CommandName: 'insertOrderedList', Tooltip: editorResources.InsertOrderedList, ElementWhiteList: { ol: [], li: [] } },
                    { CommandName: 'insertUnorderedList', Tooltip: editorResources.InsertUnorderedList, ElementWhiteList: { ul: [], li: [] } },

                    { CommandName: 'createLink', Tooltip: editorResources.CreateLink, ElementWhiteList: { a: ['href'] } },
                    { CommandName: 'UnLink', Tooltip: editorResources.UnLink },

                    { CommandName: 'RemoveFormat', Tooltip: editorResources.RemoveFormat },
                    { CommandName: 'SelectAll', Tooltip: editorResources.SelectAll },
                    { CommandName: 'UnSelect', Tooltip: editorResources.UnSelect },

                    { CommandName: 'Delete', Tooltip: editorResources.Delete },
                    { CommandName: 'Cut', Tooltip: editorResources.Cut },
                    { CommandName: 'Paste', Tooltip: editorResources.Paste },


                    { CommandName: 'BackColor', Tooltip: editorResources.BackColor, ElementWhiteList: { font: 'style', span: 'style' }, AttributeWhiteList: { style: 'background-color' } },
                    { CommandName: 'ForeColor', Tooltip: editorResources.ForeColor, ElementWhiteList: { font: 'color' }, AttributeWhiteList: { font: 'color' } },

                    { CommandName: 'FontName', Tooltip: editorResources.FontName, ElementWhiteList: { font: ['face'] }, AttributeWhitList: { face: [] } },
                    { CommandName: 'FontSize', Tooltip: editorResources.FontSize, ElementWhiteList: { font: ['size'] }, AttributeWhitList: { size: [] } },

                    { CommandName: 'Indent', Tooltip: editorResources.Indent, ElementWhiteList: { blockquote: ['style', 'dir'] }, AttributeWhitList: { style: ['margin', 'margin-right', 'padding', 'border'], dir: ['ltr', 'rtl', 'auto'] } },
                    { CommandName: 'Outdent', Tooltip: editorResources.Outdent },
                    { CommandName: 'InsertHorizontalRule', Tooltip: editorResources.InsertHorizontalRule, ElementWhiteList: { hr: ['size', 'width'] }, AttributeWhiteList: { size: [], width: [] } },

                    { CommandName: 'HorizontalSeparator', Tooltip: '' }
                ];
                if (navigator.appVersion.match(/MSIE/))
                    buttons.splice(0, 2);
                var type = Sys.Extended.UI.HtmlEditorExtenderBehavior;
                if (!type._customized) {
                    type.prototype.old_executeCommand = type.prototype._executeCommand;
                    type.prototype._executeCommand = function (command) {
                        $(this._editableDiv).focus();
                        this.old_executeCommand(command);
                    };
                    type._customized = true;
                }
                var editor = $create(type, {
                    ToolbarButtons: buttons, id: element.id + '$Editor'
                }, null, null, element);
                editor._noEncoding = true;
                editor._editableDiv.tabIndex = element.tabIndex;
                var topButtonContainer = $(editor._topButtonContainer);
                topButtonContainer.find('nobr span').hide();
                topButtonContainer.find('select').css({ 'font-family': '', 'font-size': '' });
            }
            return true;
        },
        detach: function (element, viewType) {
            if (typeof CKEDITOR != 'undefined') {
                CKEDITOR.remove(element.id);
            } else {
                var editor = $find(element.id + '$Editor');
                if (editor)
                    editor.dispose();
            }
            return true;
        },
        persist: function (element) {
            if (typeof CKEDITOR != 'undefined') {
                element.value = CKEDITOR.instances[element.id].getData();
            }
            else {
                var editor = $find(element.id + '$Editor');
                if (editor)
                    element.value = editor._editableDiv.innerHTML;
            }
        }
    };

    _web.PageState = {};
    _web.PageState._init = function () {
        var that = this,
            ostate,
            state;
        if (!that._state) {
            ostate = that._ostate = $('#__COTSTATE');
            state = ostate.val();
            that._state = state ? _serializer.deserialize(state) : {};
        }
    };
    _web.PageState._save = function () {
        if (this._ostate.length)
            this._ostate.val(serialize(this._state));
    };
    _web.PageState.read = function (name) {
        this._init();
        return this._state[name];
    };
    _web.PageState.write = function (name, value) {
        this._init();
        this._state[name] = value;
        this._save();
    };

    _app._startDelayedLoading = function () {
        if (_app._delayedLoadingViews.length > 0 && !_app._delayedLoadingTimer)
            _app._delayedLoadingTimer = setInterval(function () {
                _app._performDelayedLoading();
            }, 500);
    };

    _app._delayedLoadingViews = [];

    _app._performDelayedLoading = function () {
        var i = 0,
            delayedLoadingViews = _app._delayedLoadingViews;
        while (i < delayedLoadingViews.length) {
            var v = delayedLoadingViews[i],
                filterSource = v._filterSource, skipLoad, master;
            if (v.get_isDisplayed()) {
                Array.remove(delayedLoadingViews, v);
                if (v._delayedLoading) {
                    if (filterSource) {
                        master = _app.find(filterSource);
                        if (master && master._busy())
                            skipLoad = true;
                    }
                    if (!skipLoad)
                        v._loadPage();
                }
            }
            else i++;
        }
        if (!delayedLoadingViews.length) {
            clearInterval(_app._delayedLoadingTimer);
            _app._delayedLoadingTimer = null;
        }
    };

    _app._tagsWithIndexes = new Array('A', 'AREA', 'BUTTON', 'INPUT', 'OBJECT', 'SELECT', 'TEXTAREA', 'IFRAME');

    _app.showMessage = function (message) {
        if (isBlank(message)) message = null;
        var bodyTag = document.getElementsByTagName('body')[0];
        if (!_app.MessageBar) {
            var panel = document.createElement('div');
            panel.id = 'DataView_MessageBar';
            bodyTag.appendChild(panel);
            Sys.UI.DomElement.setVisible(panel, false);
            Sys.UI.DomElement.addCssClass(panel, 'MessageBar');
            _app.MessageBar = $create(AjaxControlToolkit.AlwaysVisibleControlBehavior, { VerticalOffset: AjaxControlToolkit.VerticalSide.Top }, null, null, panel);
            var b = Sys.UI.DomElement.getBounds(bodyTag);
            if (b.y < 0) b.y = 0;
            _app.OriginalBodyTopOffset = b.y;
        }
        panel = $get('DataView_MessageBar');
        var visible = Sys.UI.DomElement.getVisible(panel);
        panel.innerHTML = message ? String.format('<div>{0}</div><div class="Stub"></div>', message) : '';
        Sys.UI.DomElement.setVisible(panel, message != null);
        var bounds = Sys.UI.DomElement.getBounds(panel);
        var bodyTop = message ? _app.OriginalBodyTopOffset + bounds.height : _app.OriginalBodyTopOffset;
        bodyTag.style.paddingTop = bodyTop + 'px';
        var loginDialog = $get("Membership_Login");
        if (loginDialog) loginDialog.style.marginTop = bodyTop + 'px';
        if (Sys.UI.DomElement.getVisible(panel) !== visible) _body_performResize();
    };

})();
