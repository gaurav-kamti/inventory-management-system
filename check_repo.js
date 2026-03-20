const getRepo = async () => {
  try {
    const res = await fetch('https://api.github.com/repos/gaurav-kamti/ExpensePro-AI/contents');
    const json = await res.json();
    console.log(json.map(item => item.name).join(', '));
  } catch (e) {
    console.error(e);
  }
}
getRepo();
