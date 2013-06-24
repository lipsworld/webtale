<?php
require_once('serverconf.php');

$game_id = $_POST['game_id'];
$user_id = $_POST['user_id'];

$answerObject = array();
$answerObject['success'] = false;

$con = mysql_connect($mysql_host, $mysql_user, $mysql_password);
if (!$con)
{
	$answerObject['error'] = mysql_error();
}
else
{
	mysql_select_db($mysql_database, $con);
	
	$query = "SELECT data_json FROM savegames WHERE game_id = '{$game_id}' AND user_id = '{$user_id}'";

	$sqlResult = mysql_query($query, $con);
	if ($sqlResult)
	{
		$answerObject['success'] = true;
		$object = mysql_fetch_object($sqlResult);
		if ($object)
		{
			$answerObject['data_json'] = $object->data_json;
		}
	}
	else
	{
		$answerObject['error'] = "Invalid query: " . mysql_error();
	}
}
echo json_encode($answerObject);

mysql_close($con);
?>