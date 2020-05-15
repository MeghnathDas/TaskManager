var taskCol;
var taskContainer = $(".task-collection");
var errLabel = $('#lblError');
var masterForm = $('form');
var inpDesc = $('#inpTaskDesc');
var inpDeadline = $('#inpDeadline');
var inpPriority = [$(masterForm).find('#pLow')[0], $(masterForm).find('#pMed')[0], $(masterForm).find('#pHigh')[0]];
var btnRestForm = $('#inpResetForm');
var btnSubmitForm = $('#inpSubmitForm');
const targetDataKey = 'target-id';

$(document).ready(function () {
    taskCol = new mTaskCollection();
    $(masterForm).submit(function (e) {
        e.preventDefault();
        let isUpdate = btnSubmitForm[0].value === 'Update';
        let updateTaskId = btnSubmitForm.data(targetDataKey);
        let nwTask = new vmTask();
        nwTask.Desc = this.elements[0].value;
        nwTask.TargetDate = this.elements[1].value;
        nwTask.Priority = $(this.elements).slice(2, 5).getCheckedValue();
        if (nwTask.Desc === '') {
            showError('Please enter description');
            return;
        }
        if (taskCol.isDuplicate(nwTask.Desc, isUpdate === true ? updateTaskId : undefined)) {
            showError('Duplicate task description not allowed');
            return;
        }

        if (isUpdate) {
            nwTask.Id = updateTaskId;
            taskCol.alter(nwTask);
            $(masterForm)[0].reset();
            $(taskCol).renderTasks(taskContainer);
            enableTaskOperations();
        } else {
            taskCol.add(nwTask);
            taskContainer.append(nwTask.getDomElement());
        }

        this.reset();
    });
    $(btnRestForm).bind("click", function () {
        enableTaskOperations();
        $(masterForm)[0].reset();
    });
});

jQuery.fn.extend({
    renderTasks: function (parent) {
        $(parent).empty();
        for (let tItm of this[0].items()) {
            $(parent).append(tItm.getDomElement());
        }
    },
    getCheckedValue: function () {
        let rdoElms = $(this);
        let chkItm = rdoElms.filter((i, elm) => elm.checked === true)[0];
        return chkItm ? chkItm.value : '';
    },
    setCheckedValue: function (value) {
        let rdoElms = $(this);
        let rdoItm = rdoElms.filter((i, elm) => elm.value === value)[0];
        if (rdoItm) { rdoItm.checked = true; }
    },
    enable: function () {
        let elm = $(this);
        if ($.isArray(elm)) {
            $(elm).each((i) => elm[i].removeAttr('disabled'));
        } else {
            elm.removeAttr('disabled');
        }
    },
    disable: function () {
        let elm = $(this);
        if ($.isArray(elm)) {
            $(elm).each((i) => elm[i].attr('disabled', 'disabled'));
        } else {
            elm.attr('disabled', 'disabled');
        }
    }
});

function showError(msg) {
    errLabel.clearQueue();
    errLabel.text(msg);
    errLabel.fadeIn()
        .delay(2000)
        .fadeOut('slow');
}
function disableTaskOperations() {
    $(taskContainer).find('#pLow').disable();
    $(taskContainer).find('#pMed').disable();
    $(taskContainer).find('#pHigh').disable();
    $(taskContainer).find('.edit').disable();
    $(taskContainer).find('.delete').disable();
    btnSubmitForm.val('Update');
}
function enableTaskOperations() {
    $(taskContainer).find('#pLow').enable();
    $(taskContainer).find('#pMed').enable();
    $(taskContainer).find('#pHigh').enable();
    $(taskContainer).find('.edit').enable();
    $(taskContainer).find('.delete').enable();
    $(btnSubmitForm).removeData(targetDataKey);
    btnSubmitForm.val('Add');
}

class mTask {
    constructor() {
        this.Id = undefined;
        this.Desc = undefined;
        this.Priority = undefined;
        this.TargetDate = undefined;
    }
}

class vmTask extends mTask {
    constructor() {
        super();
    }

    getDomId = function () {
        return `tskItm${this.Id}`;
    }

    getDomElement = function () {
        let tItm = document.createElement("div");
        tItm.className = "task-item";
        tItm.id = this.getDomId();

        $(tItm).html(`
        <div class="detail-area">
            <h5><b>${this.Desc}</b></h5>
            <p>Deadline: ${this.TargetDate === '' ? 'Not set' : this.TargetDate}</p>
            <div class="priority-input" data-${targetDataKey}="${this.Id}">
                    <div>
                        <input type="radio" id="pLow" name="priority-${this.getDomId()}" value="Low">
                        <label for="pLow">Low</label>
                    </div>
            
                    <div>
                        <input type="radio" id="pMed" name="priority-${this.getDomId()}" value="Medium">
                        <label for="pMed">Medium</label>
                    </div>
            
                    <div>
                        <input type="radio" id="pHigh" name="priority-${this.getDomId()}" value="High">
                        <label for="pHigh">High</label>
                    </div>
            </div>
        </div>
        <div class="action-area">
            <input type="button" data-${targetDataKey}="${this.Id}" class="btn edit" value="Edit" />
            <input type="button" data-${targetDataKey}="${this.Id}" class="btn delete" value="Remove" />
        </div>`);
        let rdoPriority = $(tItm).find(`input[name="priority-${this.getDomId()}"]`);
        rdoPriority.setCheckedValue(this.Priority);

        $(rdoPriority).change(function () {
            let taskId = $(this).parent().parent().data(targetDataKey);
            let matchedTask = taskCol.items(taskId);
            matchedTask.Priority = $(this).val();
            taskCol.alter(matchedTask);
        });

        let editBtn = $(tItm).find(".edit");
        let delBtn = $(tItm).find(".delete");

        $(editBtn).bind("click", function () {
            let taskItm = taskCol.items(editBtn.data(targetDataKey));

            $(masterForm)[0].reset();
            inpDesc.val(taskItm.Desc);
            inpDeadline.val(taskItm.TargetDate);
            $(inpPriority).setCheckedValue(taskItm.Priority);

            btnSubmitForm.data(targetDataKey, taskItm.Id);
            disableTaskOperations();
        });

        $(delBtn).bind("click", function () {
            if (taskCol.remove(delBtn.data(targetDataKey))) {
                $(taskCol).renderTasks(taskContainer);
            } else {
                showError('Unknown error: Not deleted');
            }
        });

        return tItm;
    };
}

class mTaskCollection {
    constructor() {
        this._mapTask = new Map();
    }

    add = function (taskItem) {
        taskItem.Id = this._mapTask.size + 1;
        this._mapTask.set(taskItem.Id, taskItem);
        return this.items(taskItem.Id);
    };
    remove = function (taskId) {
        this._mapTask.delete(taskId);
        return true;
    };
    alter = function (taskItem) {
        if (this._mapTask.has(taskItem.Id)) {
            this._mapTask.set(taskItem.Id, taskItem)
            return true;
        }
        return false;
    }
    clear = function () {
        this._mapTask = new Map();
    }
    isDuplicate = function (taskDesc, exceptTaskId) {
        let taskItm = [];
        if (exceptTaskId) {
            taskItm = Array.from(this._mapTask.values())
                .filter((itm) => itm.Desc === taskDesc && itm.Id !== exceptTaskId);
        } else {
            taskItm = Array.from(this._mapTask.values())
                .filter((itm) => itm.Desc === taskDesc);
        }
        return taskItm.length > 0;
    }

    items = function (taskId) {
        if (!taskId) {
            return this._mapTask.values();
        } else {
            return this._mapTask.get(taskId);
        }
    };
}
