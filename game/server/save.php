<?php
require_once('serverconf.php');

$game_id = $_POST['game_id'];
$user_id = $_POST['user_id'];
$data_json = $_POST['data_json'];

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
	
	$query = "INSERT INTO savegames (game_id, user_id, data_json)
	VALUES ('{$game_id}', '{$user_id}', '{$data_json}')
	ON DUPLICATE KEY UPDATE data_json = '{$data_json}'";

	$sqlResult = mysql_query($query, $con);
	if ($sqlResult)
	{
		$answerObject['success'] = true;
	}
	else
	{
		$answerObject['error'] = "Invalid query: " . mysql_error();
	}
}
echo json_encode($answerObject);

mysql_close($con);
?>