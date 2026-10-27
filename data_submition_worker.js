window.subject_data_worker = {	
	postMessage: function (data) {
		return data_helper.append_subject_data(data);
	}
}