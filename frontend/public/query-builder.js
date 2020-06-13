/**
 * Builds a query string using the current document object model (DOM).
 * Must use the browser's global document object {@link https://developer.mozilla.org/en-US/docs/Web/API/Document}
 * to read DOM information.
 *
 * @returns query string adhering to the query EBNF
 */
CampusExplorer.buildQuery = function() {
    let query   = "";

    const formElement = getQueryForm();

    const dataset           = getDataset(formElement);
    const group             = getGroup(formElement);
    const conditions        = getConditions(formElement);
    const columns           = getColumns(formElement);
    const transformations   = getTransformations(formElement);
    const order             = getOrder(formElement);

    query = dataset + group + ", " + conditions + "; " +
            columns + transformations  + order + ".";

    return query;
};

function getQueryForm() {
    const tabsElements = document.querySelectorAll(".tab-panel");

    for (const tabElement of tabsElements) {
        if (tabElement.classList.contains("active")) {
            return tabElement.children[0]
        }
    }
}

function getDataset(formElement) {
    const dataKind = formElement.dataset.type;

    if (dataKind === "courses") {
        return "In courses dataset courses";
    } else if (dataKind === "rooms") {
        return "In rooms dataset rooms";
    } else {
        console.error("you have to specifiy your dataset type!");
    }
}

function getGroup(formElement) {
    const fields = formElement.querySelectorAll(".groups .control-group .field");
    const keys   = [];

    // Get only check fields
    for (const field of fields) {
        const isChecked = field.children[0].hasAttribute("checked");
        const key       = field.children[1].innerHTML;

        if (isChecked) {
            keys.push(key);
        }
    }

    // Generate group and return it, if there is keys
    if (keys.length) {
        return " grouped by" + stringifyKeys(keys);;
    }

    // Return empty if there is no grouping keys
    return "";
}

function getConditions(formElement){
    const conditionsType     = formElement.querySelector(".conditions .condition-type div input[checked]").getAttribute("value");
    const conditionsElements = formElement.querySelectorAll(".conditions .conditions-container .condition");
    const conditions         = [];
    let   filter             = "find entries whose ";

    // Get each condition
    for (const conditionElement of conditionsElements) {
        let   isNot    = conditionElement.querySelector(".not input").hasAttribute("checked");
        const key      = conditionElement.querySelector(".fields select option[selected='selected']").innerHTML.trim();
        const operator = conditionElement.querySelector(".operators select option[selected='selected']").innerHTML.trim();
        const value    = conditionElement.querySelector(".term input").getAttribute("value");

        // Solve for None
        if (conditionsType === "none") {
            if (isNot) {
                isNot = false;
            } else {
                isNot = true;
            }
        }
        const condition = getOneCondition(isNot, key, operator, value);
        conditions.push(condition);
    }

    // Handle Conditions Types
    let logical = "";
    if (conditionsType === "any") {
        logical = " or ";
    } else {
        logical = " and ";
    }

    if (conditions.length === 1) {
        filter = filter + conditions.pop();
    } else if (conditions.length > 1) {
        for (const condition of conditions) {
            filter += condition + logical;
        }

        // Delete the last redundent logical
        logical === " or " ? filter  = filter.substr(0, filter.length - 4) : filter  = filter.substr(0, filter.length - 5);

    } else {
        console.error("You have to provide at least one condition!!");
    }

    return filter;
}

function getOneCondition(isNot, key, operator, value) {
    condition = "" + key;

    // Handle is Not
    if (isNot) {
        condition += " is not"
    } else {
        condition += " is"
    }

    // Handle Operator
    switch (operator) {
        case "EQ":
            condition += " equal to"
            break;
        case "GT":
            condition += " greater than"
            break;
        case "IS":
            break;
        case "LT":
            condition += " less than"
            break;
        default:
            console.error("You have to input a valid condition!!");
            break;
    }

    // Handle values according to operator
    if (operator === "IS") { // IS
        if (value.startsWith("*") && value.endsWith("*")) { // Includes
            if (isNot) {
                value = value.slice(1, -1);
                condition = condition.substr(0, condition.length - 2);
                condition += "does not include " + "\"" + value + "\"";
            } else {
                value = value.slice(1, -1);
                condition = condition.substr(0, condition.length - 2);
                condition += "includes " + "\"" + value + "\"";
            }
        } else if (value.startsWith("*")) { // Ends with
            if (isNot) {
                value = value.slice(1);
                condition = condition.substr(0, condition.length - 2);
                condition += "does not end with " + "\"" + value + "\"";
            } else {
                value = value.slice(1);
                condition = condition.substr(0, condition.length - 2);
                condition += "ends with " + "\"" + value + "\"";
            }
        } else if (value.endsWith("*")) { // Starts With
            if (isNot) {
                value = value.slice(0, -1);
                condition = condition.substr(0, condition.length - 2);
                condition += "does not begin with " + "\"" + value + "\"";
            } else {
                value = value.slice(0, -1);
                condition = condition.substr(0, condition.length - 2);
                condition += "begins with " + "\"" + value + "\"";
            }
        } else {
            condition += " \"" + value + "\"";
        }
    } else { // GT or LT or EQ
        condition += " " + value;
    }

    return condition;
}

function getColumns(formElement){
    const fields = formElement.querySelectorAll(".columns .control-group .field");
    const transformations = formElement.querySelectorAll(".columns .control-group .transformation");
    const keys   = [];

    // Get only check fields
    for (const field of fields) {
        const isChecked = field.children[0].hasAttribute("checked");
        const key       = field.children[1].innerHTML;

        if (isChecked) {
            keys.push(key);
        }
    }

    // Get only check transformation if exists
    for (const transformation of transformations) {
        const isChecked = transformation.children[0].hasAttribute("checked");
        const key       = transformation.children[1].innerHTML;

        if (isChecked) {
            keys.push(key);
        }
    }

    // Generate group and return it, if there is keys
    if (keys.length) {
        return "show" + stringifyKeys(keys);;
    } else {
        console.error("you have to choose one column at least!!");
    }
}

function getTransformations(formElement){
    const transformationsElements = formElement.querySelectorAll(".transformations .transformations-container .transformation")
    const keys   = [];

    // Get each transformation
    for (const transformationsElement of transformationsElements) {
        const item     = transformationsElement.querySelector(".term input").getAttribute("value");
        const operator = transformationsElement.querySelector(".operators select option[selected='selected']").innerHTML.trim();
        const field    = transformationsElement.querySelector(".fields select option[selected='selected']").innerHTML.trim();

        keys.push(item + "$SPACE$is$SPACE$the$SPACE$" + operator + "$SPACE$of$SPACE$" + field);
    }

    // Generate group and return it, if there is keys
    if (keys.length) {
        return ", where" + stringifyKeys(keys);;
    }

    // Return empty if there is no grouping keys
    return "";
}

function getOrder(formElement){
    const fields       = formElement.querySelector(".order .control-group .fields")
                                    .children[0].children;
    const isDescending = formElement.querySelector(".order .control-group .descending")
                                    .children[0].hasAttribute("checked");
    const keys         = [];
    let kind           = "";

    // Get sort Kind
    if (isDescending) {
        kind = "; sort in descending order by";
    } else {
        kind = "; sort in ascending order by";
    }

    // Get only check fields
    for (const field of fields) {
        const isChecked = field.hasAttribute("selected");
        const key       = field.innerHTML.trim();

        if (isChecked) {
            keys.push(key);
        }
    }

    // Generate group and return it, if there is keys
    if (keys.length) {
        return kind + stringifyKeys(keys);;
    } else {
        return "";
    }
}

function stringifyKeys(keys) {
    let stringyKeys = "";

    // Put all keys between spaces
    for (const key of keys) {
        stringyKeys += " " + key;
    }

    // Convert spaces to commas
    stringyKeys = stringyKeys.replace("Full Name", "FullName").replace("Short Name", "ShortName");
    stringyKeys = stringyKeys.split(" ").join(", ").replace(", ", " ");
    stringyKeys = stringyKeys.split("FullName").join("Full Name")
                             .split("ShortName").join("Short Name")
                             .split("$SPACE$").join(" ");


    // Convert last comma to " and " (if exists)
    lastCommaIdx   = stringyKeys.lastIndexOf(", ");

    if (lastCommaIdx != -1) {
        stringyKeys = stringyKeys.replaceAt(lastCommaIdx, " and");
    }

    return stringyKeys;
}

String.prototype.replaceAt = function(index, replacement) {
    const firstPart = this.substr(0, index);
    const lastPart  = this.substr(index + 1);

    return firstPart + replacement + lastPart;
}
