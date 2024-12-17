document.getElementById('userForm').addEventListener('submit', function(event) {
  event.preventDefault();
  const userID = document.getElementById('userID').value.trim();

  if (!userID) {
      alert("Please enter your User ID.");
      return;
  }

  if (!userID.startsWith("R_")) {
      alert("Invalid User ID. It should start with 'R_'.");
      return;
  }

  chrome.runtime.sendMessage({ type: "setUserID", userID }, (response) => {
      if (response?.status === "success") {
          alert("User ID recorded successfully. You may now open the survey form.");
          window.close();
      } else {
          alert("Failed to record User ID. Please try again.");
      }
  });
});

document.getElementById('btIns').addEventListener('click', () => {
  alert("Instructions: Please enter your User ID, which should start with 'R_'. Follow the instructions on the form.");
});

document.getElementById('btHelp').addEventListener('click', () => {
  alert("Help: For assistance, contact sandhya.venkataramaiah@vanderbilt.edu or call (phone_number)"); 
});
