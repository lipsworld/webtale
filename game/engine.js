/*************************************************
WebTale Adventure Game Engine
Inutilis Software (http://www.inutilis.de)
Developed 2012 by Timo Kloss
DO WANT YOU WANT WITH THIS, BUT ON YOUR OWN RISK!
*************************************************/

const VERSION = "1.4";

// game data
var xmlLocations = new Array();
var xmlObjectDefs = new Array();
var xmlLocationItems;
var xmlLocationObjectHandlers;

// current location
var locationInfos;
var locationItemInfos;
var locationObjectNames;
var currentUseWith;

// current game state
var inventoryNames = new Array();
var objectsTaken = new Object();
var variables = new Object();
var locationItemStatus = new Object();

// user interface
var loadingImage;
var standardTexts;

// server settings
var serverUrl;
var serverGameId;

// user ID needed for saving games on server
var userId;

// social network share function -> function(title, text, picture)
var shareFunction;

// SETTERS *************************************************

function setUserId(id)
{
	userId = id;
	disableLoadSaveButtons(false);
}

// func: function(title, text, picture)
function setShareFunction(func)
{
	shareFunction = func;
}

// LOGIC *************************************************

function loadXML(url)
{
	clearText();
	addText("Loading...");
	
	loadingImage = new Image();
	loadingImage.src="images/loading.gif";
	loadingImage.className = "loading";
	loadingImage.name = "loading";
	
	document.getElementById("image-container").appendChild(loadingImage);
	
	var xhttp;
	if (window.XMLHttpRequest)
	{
		xhttp = new XMLHttpRequest();
	}
	else
	{
		xhttp = new ActiveXObject("Microsoft.XMLHTTP");
	}
	
	xhttp.onreadystatechange = function()
	{
		if (xhttp.readyState == 4)
    	{
    		if (xhttp.status == 200 || xhttp.status == 0)
    		{
	    		onLoadedXML(xhttp.responseXML.documentElement);
	    	}
    		else
    		{
    			alert("Error loading game data.");
	    	}
    	}
    }
    
	xhttp.open("GET", url, true);
	xhttp.send();
}

function onLoadedXML(xml)
{
	var i;
	
	setWindowTitle(xml.getAttribute("name"));
	
	var infos = xml.getElementsByTagName("info");
	if (infos.length > 0)
	{
		setInfo(infos[0].childNodes[0].nodeValue);
	}
	
	var serverurls = xml.getElementsByTagName("serverurl");
	if (serverurls.length > 0)
	{
		serverUrl = serverurls[0].childNodes[0].nodeValue;
	}
	
	var servergameids = xml.getElementsByTagName("servergameid");
	if (servergameids.length > 0)
	{
		serverGameId = servergameids[0].childNodes[0].nodeValue;
	}
	
	standardTexts = new Object();
	var texts = xml.getElementsByTagName("text");
	for (i = 0; i < texts.length; i++)
	{
		var text = texts[i];
		standardTexts[text.getAttribute("name")] = text.childNodes[0].nodeValue;
	}

	var locations = xml.getElementsByTagName("location");
	for (i = 0; i < locations.length; i++)
	{
		var location = locations[i];
		xmlLocations[location.getAttribute("name")] = location;
	}

	var objectDefs = xml.getElementsByTagName("objectdef");
	for (i = 0; i < objectDefs.length; i++)
	{
		var objectDef = objectDefs[i];
		xmlObjectDefs[objectDef.getAttribute("name")] = objectDef;
	}
	
	if (useServer() && !userId)
	{
		// disable until user ID is set
		disableLoadSaveButtons(true);
	}
	
	setLocation(locations[0].getAttribute("name"));
}

function setLocation(name)
{
	var location = xmlLocations[name];
	
	if (location)
	{
		scrollToTop();

		var objectHandlersArray = location.getElementsByTagName("objects");
		xmlLocationObjectHandlers = (objectHandlersArray.length > 0) ? objectHandlersArray[0] : null;
		
		locationInfos = new Object();
		locationInfos.name = location.getAttribute("name");
		locationInfos.type = "location";
		if (location.getAttribute("type"))
		{
			locationInfos.type = location.getAttribute("type");
		}
		
		setTitle(location.getAttribute("name"));
		setImage(location.getAttribute("image"));
		clearText();
		execute(location.getElementsByTagName("init")[0]);
		setItems(location.getElementsByTagName("item"));
		setObjects(location.getElementsByTagName("object"));
		showItemsAndObjects();
		showInventoryButton();
	}
	else
	{
		alert("Error: Location '" + name + "' not found.");
	}
}

function execute(xml)
{
	for (var i = 0; i < xml.childNodes.length; i++)
	{
		var element = xml.childNodes[i];
		if (element.nodeType == 1) // ELEMENT_NODE
		{
			var action = element.nodeName.toLowerCase();
			var expression = element.getAttribute("if");
			if (expression == null || isExpressionTrue(expression))
			{
				var name;
				var value;
				if (action == "jump")
				{
					setLocation(element.getAttribute("to"));
					return;
				}
				else if (action == "do")
				{
					execute(element);
				}
				else if (action == "get")
				{
					takeObject(element.getAttribute("name"));
				}
				else if (action == "drop")
				{
					name = element.getAttribute("name");
					if (locationObjectNames.indexOf(name) != -1)
					{
						objectsTaken[name] = true;
						showItemsAndObjects();
					}
					var pos = inventoryNames.indexOf(name);
					if (pos >= 0)
					{
						inventoryNames.splice(pos, 1);
						showInventoryButton();
					}
				}
				else if (action == "show")
				{
					name = element.getAttribute("name");
					var locationName = element.getAttribute("location");
					setLocationItemStatus(locationName ? locationName : locationInfos.name, name, "visible", true);
					if (!locationName || locationName == locationInfos.name)
					{
						showItemsAndObjects();
					}
				}
				else if (action == "hide")
				{
					name = element.getAttribute("name");
					var locationName = element.getAttribute("location");
					setLocationItemStatus(locationName ? locationName : locationInfos.name, name, "hidden", true);
					if (!locationName || locationName == locationInfos.name)
					{
						showItemsAndObjects();
					}
				}
				else if (action == "set")
				{
					value = element.getAttribute("value");
					variables[element.getAttribute("name")] = value ? parseInt(value) : 1;
				}
				else if (action == "add")
				{
					name = element.getAttribute("name");
					value = element.getAttribute("value");
					if (variables[name])
					{
						variables[name] += value ? parseInt(value) : 1;
					}
					else
					{
						variables[name] = value ? parseInt(value) : 1;
					}
				}
				else if (action == "showimage")
				{
					scrollToTop();
					setImage(element.getAttribute("file"));
				}
				else if (action == "share")
				{
					if (shareFunction)
					{
						shareTitle = element.getAttribute("title");
						shareText = element.getAttribute("text");
						sharePicture = element.getAttribute("picture");
						shareFunction(shareTitle, shareText, sharePicture);
					}
				}
			}
		}
		else if (element.nodeType == 3) // TEXT_NODE
		{
			var text = trim(element.nodeValue);
			if (text.length > 0)
			{
				addText(text);
			}
		}
	}
}

// EXPRESSIONS *************************************************

function isExpressionTrue(expression)
{
	if (expression.length == 0)
	{
		alert("Error: IF expression is empty.");
		return false;
	}
	var parts = splitParts(expression);
	switch (parts.length)
	{
		case 1:
			return (parseValue(parts[0]) != 0);
			
		case 2:
			switch (parts[0])
			{
				case "has":
					return (inventoryNames.indexOf(parts[1]) >= 0);

				case "hasnot":
					return (inventoryNames.indexOf(parts[1]) == -1);
					
				case "not":
					return (parseValue(parts[1]) == 0);
			}
			break;
			
		case 3:
			var value1 = parseValue(parts[0]);
			var value2 = parseValue(parts[2]);
			switch (parts[1])
			{
				case "is":
					return (value1 == value2);
				
				case "ismin":
					return (value1 >= value2);
				
				case "ismax":
					return (value1 <= value2);
				
				case "isnot":
					return (value1 != value2);
			}
			break;
	}
	alert("Error: IF expression '" + expression + "' is not valid.");
	return false;
}

function parseValue(string)
{
	var numberChars = "0123456789-";
	var result = 0;
	if (numberChars.indexOf(string.charAt(0)) != -1)
	{
		// number
		result = parseInt(string);
	}
	else
	{
		if (variables[string])
		{
			result = variables[string];
		}
	}
	return result;
}

function splitParts(string)
{
	var array = new Array();
	var len = string.length;
	var lastPartIndex = 0;
	var space = " ";
	var quot = "'";
	var isInQuot = false;
	var quotLen = 0;
	for (var i = 0; i < len; i++)
	{
		var ch = string.charAt(i);
		if (ch == space)
		{
			if (!isInQuot)
			{
				if (i != lastPartIndex)
				{
					array.push(string.substring(lastPartIndex + quotLen, i - quotLen));
				}
				lastPartIndex = i + 1;
				quotLen = 0;
			}
		}
		else if (ch == quot)
		{
			isInQuot = !isInQuot;
			if (isInQuot)
			{
				quotLen = 1;
			}
		}
	}
	if (lastPartIndex != len)
	{
		array.push(string.substring(lastPartIndex + quotLen, len - quotLen));
	}
	return array;
}

// CONTROL *************************************************

function setLocationItemStatus(locationName, name, status, overwrite)
{
	if (!locationItemStatus[locationName])
	{
		locationItemStatus[locationName] = new Object();
	}
	if (overwrite || !locationItemStatus[locationName][name])
	{
		locationItemStatus[locationName][name] = status;
	}
}

function getLocationItemStatus(locationName, name)
{
	if (locationItemStatus[locationName])
	{
		if (locationItemStatus[locationName][name])
		{
			return locationItemStatus[locationName][name];
		}
	}
	return null;
}

function setItems(xmlItemsArray)
{
	xmlLocationItems = new Array();
	locationItemInfos = new Array();
	for (var i = 0; i < xmlItemsArray.length; i++)
	{
		var element = xmlItemsArray[i];
		var name = element.getAttribute("name");
		var status = element.getAttribute("status");
		xmlLocationItems[name] = element;

		var info = new Object();
		info.name = name;
		info.canlookat = element.getElementsByTagName("onlookat").length > 0;
		locationItemInfos.push(info);

		if (status)
		{
			setLocationItemStatus(locationInfos.name, name, status, false);
		}
	}
}

function setObjects(xmlObjectsArray)
{
	locationObjectNames = new Array();
	for (var i = 0; i < xmlObjectsArray.length; i++)
	{
		var element = xmlObjectsArray[i];
		locationObjectNames.push(element.getAttribute("name"));
	}
}

function useItem(name)
{
	var item = xmlLocationItems[name];
	var firstElement = getFirstTagChild(item);
	if (firstElement != null && firstElement.nodeName.substring(0, 2).toLowerCase() == "on")
	{
		// has event handlers
		var handlers = item.getElementsByTagName("onuse");
		if (handlers.length > 0)
		{
			execute(handlers[0]);
		}
		else
		{
			addText(getText("DefaultUseItem").replace("%", name));
		}
	}
	else
	{
		// use everything as "onuse" event handler
		execute(item);
	}
}

function takeObject(name)
{
	inventoryNames.unshift(name);
	if (locationObjectNames.indexOf(name) != -1)
	{
		objectsTaken[name] = true;
		showItemsAndObjects();
	}
	showInventoryButton();
}

function lookAtItem(name)
{
	var item = xmlLocationItems[name];
	var handlers = item.getElementsByTagName("onlookat");
	if (handlers.length > 0)
	{
		execute(handlers[0]);
	}
	else
	{
		addText(getText("DefaultLookAt").replace("%", name));
	}
}

function handleObjectInLocation(name, event)
{
	var handlers;
	
	// check for handler in location
	if (xmlLocationObjectHandlers != null)
	{
		handlers = xmlLocationObjectHandlers.getElementsByTagName(event);
		for (var i = 0; i < handlers.length; i++)
		{
			if (handlers[i].getAttribute("name") == name)
			{
				execute(handlers[i]);
				return true;
			}
		}
	}
	return false;
}

function handleObjectInDefs(name, event, isDefaultAction)
{
	// check for handler in object
	var item = xmlObjectDefs[name];
	if (item)
	{
		var firstElement = getFirstTagChild(item);
		if (firstElement != null && firstElement.nodeName.substring(0, 2).toLowerCase() == "on")
		{
			// has event handlers
			handlers = item.getElementsByTagName(event);
			if (handlers.length > 0)
			{
				execute(handlers[0]);
				return true;
			}
		}
		else if (isDefaultAction)
		{
			// use everything as default event handler
			execute(item);
			return true;
		}
	}
	return false;
}

function useObject(name)
{
	if (!handleObjectInLocation(name, "onuse"))
	{
		if (!handleObjectInDefs(name, "onuse", false))
		{
			addText(getText("DefaultUseObject").replace("%", name));
		}
	}
}

function useObjectWith(name)
{
	currentUseWith = name;
	showItemsAndObjects();
	showInventory();
}

function cancelUseWith()
{
	currentUseWith = null;
	showItemsAndObjects();
	showInventory();
}

function useWithCurrent(name)
{
	var useWithName = currentUseWith;
	currentUseWith = null;
	
	if (!handleUseWith(useWithName, name, xmlObjectDefs))
	{
		if (!handleUseWith(name, useWithName, xmlObjectDefs))
		{
			if (!handleUseWith(name, useWithName, xmlLocationItems))
			{
				addText(getText("DefaultUseWith").replace("%", useWithName).replace("%", name));
			}
		}
	}
	
	showItemsAndObjects();
	showInventory();
}

function handleUseWith(name1, name2, elements)
{
	var item = elements[name1];
	if (item != null)
	{
		var handlers = item.getElementsByTagName("onusewith");
		for (var i = 0; i < handlers.length; i++)
		{
			if (handlers[i].getAttribute("name") == name2)
			{
				execute(handlers[i]);
				return true;
			}
		}
	}
	return false;
}

function lookAtObject(name)
{
	if (!handleObjectInLocation(name, "onlookat"))
	{
		if (!handleObjectInDefs(name, "onlookat", true))
		{
			addText(getText("DefaultLookAt").replace("%", name));
		}
	}
}

function giveObject(name)
{
	if (!handleObjectInLocation(name, "ongive"))
	{
		if (xmlLocationObjectHandlers != null)
		{
			var handlers = xmlLocationObjectHandlers.getElementsByTagName("onnoneed");
			if (handlers.length > 0)
			{
				execute(handlers[0]);
			}
			else
			{
				addText(getText("DefaultGive").replace("%", name));
			}
		}
		else
		{
			addText(getText("DefaultGive").replace("%", name));
		}
	}
}

// UTILS *************************************************

function safeName(name)
{
	return name.replace(/'/g, "\\'").replace(/"/g, "\\\"");
}

function getFirstTagChild(xml)
{
	for (var i = 0; i < xml.childNodes.length; i++)
	{
		var element = xml.childNodes[i];
		if (element.nodeType == 1) // ELEMENT_NODE
		{
			return element;
		}
	}
	return null;
}

function getText(name)
{
	if (standardTexts.hasOwnProperty(name))
	{
		return standardTexts[name];
	}
	return "-ERROR-";
}

function trim(string)
{
	return string.replace(/^\s+/g,'').replace(/\s+$/g,'');
}

// SAVE GAMES *************************************************

function useServer()
{
	return (serverUrl && serverUrl.length > 0 && serverGameId && serverGameId.length > 0);
}

function saveGame()
{
	try
	{
		if (useServer())
		{
			disableLoadSaveButtons(true);
			var savegame = {
				'inventoryNames': inventoryNames,
				'objectsTaken': objectsTaken,
				'variables': variables,
				'locationItemStatus': locationItemStatus,
				'currentLocation': locationInfos.name
			};
			var sendData = {
				'game_id': serverGameId,
				'user_id': userId,
				'data_json': JSON.stringify(savegame)
			};
			$.ajax(serverUrl + "save.php", {
				type: 'POST',
				dataType: 'json',
				data: sendData,
				success: onSavedOnServer
			});
		}
		else
		{
			localStorage.inventoryNames = JSON.stringify(inventoryNames);
			localStorage.objectsTaken = JSON.stringify(objectsTaken);
			localStorage.variables = JSON.stringify(variables);
			localStorage.locationItemStatus = JSON.stringify(locationItemStatus);
			localStorage.currentLocation = locationInfos.name;
			alert("The current game was saved locally in this browser.");
		}
	}
	catch (e)
	{
		alert("Error! The current game could not be saved.");
	}
}

function loadGame()
{
	try
	{
		if (useServer())
		{
			disableLoadSaveButtons(true);
			var sendData = {
				'game_id': serverGameId,
				'user_id': userId,
			};
			$.ajax(serverUrl + "load.php", {
				type: 'POST',
				dataType: 'json',
				data: sendData,
				success: onLoadedFromServer
			});
		}
		else
		{
			if (localStorage.hasOwnProperty("currentLocation"))
			{
				inventoryNames = JSON.parse(localStorage.inventoryNames);
				objectsTaken = JSON.parse(localStorage.objectsTaken);
				variables = JSON.parse(localStorage.variables);
				locationItemStatus = JSON.parse(localStorage.locationItemStatus);
				setLocation(localStorage.currentLocation);
			}
			else
			{
				alert("There is no saved game available.");
			}
		}
	}
	catch (e)
	{
		alert("Error! Game could not be loaded.");
	}
}

function onSavedOnServer(data)
{
	disableLoadSaveButtons(false);
	if (data.success)
	{
		alert("The current game was saved.");
	}
	else
	{
		alert("Error! The current game could not be saved: " + data.error);
	}
}

function onLoadedFromServer(data)
{
	disableLoadSaveButtons(false);
	if (data.success)
	{
		if (data.data_json)
		{
			var savegame = JSON.parse(data.data_json);
			inventoryNames = savegame.inventoryNames;
			objectsTaken = savegame.objectsTaken;
			variables = savegame.variables;
			locationItemStatus = savegame.locationItemStatus;
			setLocation(savegame.currentLocation);
		}
		else
		{
			alert("There is no saved game available.");
		}
	}
	else
	{
		alert("Error! Game could not be loaded: " + data.error);
	}
}

// USER INTERFACE *************************************************

function scrollToTop()
{
	window.scrollTo(0, 0);
}

function setWindowTitle(title)
{
	document.title = title;
}

function setTitle(title)
{
	document.getElementById("title").innerHTML = title;
}

function setImage(image)
{
	var container = document.getElementById("image-container");
	
	// if image loads very fast (cached?), then show it directly.
	// if it takes a while, show loading animation and then fade image in.
	
	var timeout = setTimeout(function() {
		container.innerHTML = "";
		container.appendChild(loadingImage);
	}, 50);
	
	var imageObj = new Image();
	imageObj.src = "gamedata/" + image;
	imageObj.className = "image";
	imageObj.onload = function() {
		clearTimeout(timeout);
		var fadeIn = document.getElementsByName("loading").length > 0;
		container.innerHTML = "";
		if (fadeIn)
		{
			imageObj.style.display = "none";
		}
		container.appendChild(imageObj);
		if (fadeIn)
		{
			$(imageObj).fadeIn(400);
		}
	}
}

function clearText()
{
	document.getElementById("text").innerHTML = "";
}

function addText(text)
{
	var paragraph = document.createElement("p");
	
	var parts = text.split("\\n");
	for (var i = 0; i < parts.length; i++)
	{
		if (i > 0)
		{
			paragraph.appendChild(document.createElement("br"));
		}
		var textNode = document.createTextNode(parts[i]);
    	paragraph.appendChild(textNode);
    }
    
    var container = document.getElementById("text");
    var fadeIn = container.hasChildNodes();
	if (fadeIn)
	{
		paragraph.style.display = "none";
	}
	container.appendChild(paragraph);
	if (fadeIn)
	{
		$(paragraph).slideDown(400);
	}
	
	if (window.pageYOffset > 0)
	{
		paragraph.scrollIntoView(true);
	}
}

function showItemsAndObjects()
{
	var itemsDiv = document.getElementById("items");
	itemsDiv.innerHTML = "<ul></ul>";
	var ul = itemsDiv.childNodes[0];
	
	var i;
	var listItem;
	var info;
	var name;
	var sName;
	var html;
	
	for (i = 0; i < locationItemInfos.length; i++)
	{
		info = locationItemInfos[i];
		name = info.name;
		var status = getLocationItemStatus(locationInfos.name, name);
		
		if (status != "hidden")
		{
			listItem = document.createElement("li");
			sName = safeName(name);
			if (locationInfos.type == "person")
			{
				name = '"' + name + '"';
			}
			if (currentUseWith != null)
			{
				html = '<a href="#" onclick="useWithCurrent(\'' + sName + '\'); return false;">' + name + '</a>';
			}
			else
			{
				html = '<a href="#" onclick="useItem(\'' + sName + '\'); return false;">' + name + '</a>';
				if (info.canlookat)
				{
					html += '<span><button type="button" onclick="lookAtItem(\'' + sName + '\')">' + getText("ButtonLookAt") + '</button></span>';
				}
			}
			listItem.className = "item";
			listItem.innerHTML = html;
			ul.appendChild(listItem);
		}
	}
	
	for (i = 0; i < locationObjectNames.length; i++)
	{
		name = locationObjectNames[i];
		if (objectsTaken[name] != true)
		{
			listItem = document.createElement("li");
			sName = safeName(name);
			if (currentUseWith != null)
			{
				html = '<a href="#" onclick="useWithCurrent(\'' + sName + '\'); return false;">' + name + '</a>';
			}
			else
			{
				html = '<a href="#" onclick="lookAtObject(\'' + sName + '\'); return false;">' + name + '</a>';
				html += '<span><button type="button" onclick="takeObject(\'' + sName + '\')">' + getText("ButtonTake") + '</button></span>';
			}
			listItem.className = "object";
			listItem.innerHTML = html;
			ul.appendChild(listItem);
		}
	}
}

function showInventoryButton()
{
	document.getElementById("inventory").innerHTML = '<button type="button" id="show" onclick="showInventory()">' + getText("ButtonShowInventory") + ' (' + inventoryNames.length + ')</button>';
}

function showInventory()
{
	var inventoryDiv = document.getElementById("inventory");
	inventoryDiv.innerHTML = '<h2>' + getText("Inventory") + ' <button type="button" id="show" onclick="showInventoryButton()">' + getText("ButtonHide") + '</button></h2><ul></ul>';
	var ul = inventoryDiv.childNodes[1];
	
	var html;
	for (var i = 0; i < inventoryNames.length; i++)
	{
		var listItem = document.createElement("li");
		var name = inventoryNames[i];
		var sName = safeName(name);
		if (currentUseWith != null)
		{
			if (currentUseWith == name)
			{
				html = getText("UseWith").replace("%", name) + ' <button type="button" onclick="cancelUseWith();">' + getText("ButtonCancel") + '</button>';
			}
			else
			{
				html = '<a href="#" onclick="useWithCurrent(\'' + sName + '\'); return false;">' + name + '</a>';
			}
		}
		else
		{
			html = '<a href="#" onclick="lookAtObject(\'' + sName + '\'); return false;">' + name + '</a><span>';
			if (locationInfos.type == "person")
			{
				html += '<button type="button" onclick="giveObject(\'' + sName + '\')">' + getText("ButtonGive") + '</button>';
			}
			html += '<button type="button" onclick="useObject(\'' + sName + '\')">' + getText("ButtonUse") + '</button>';
			html += '<button type="button" onclick="useObjectWith(\'' + sName + '\')">' + getText("ButtonUseWith") + '</button>';
			html += '</span>';
		}
		listItem.innerHTML = html;
		ul.appendChild(listItem);
	}
}

function setInfo(info)
{
	var infoDiv = document.getElementById("game-info");
	infoDiv.innerHTML = "";

	var parts = info.split("\\n");
	for (var i = 0; i < parts.length; i++)
	{
		if (i > 0)
		{
			infoDiv.appendChild(document.createElement("br"));
		}
		var textNode = document.createTextNode(parts[i]);
    	infoDiv.appendChild(textNode);
    }
	
	// please don't remove or change the link to inutilis, thank you!
	var engineDiv = document.getElementById("engine-info");
	engineDiv.innerHTML = 'Uses <a href="http://www.inutilis.de/webtale/" target="_blank">WebTale Engine</a> ' + VERSION + ' by <a href="http://www.inutilis.de" target="_blank">Inutilis</a>';
}

function showInfo()
{
	$('#info-box').fadeIn(400);
	document.getElementById("container").onclick = function() {
		hideInfo();
	};
}

function hideInfo()
{
	document.getElementById("container").onclick = null;
	$('#info-box').fadeOut(400);
}

function disableLoadSaveButtons(disable)
{
	document.getElementById("load-button").disabled = disable;
	document.getElementById("save-button").disabled = disable;
}