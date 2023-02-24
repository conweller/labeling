import './App.css';
import React from 'react';

const api = "https://api.connoronweller.com"
// const api = "http://127.0.0.1:8000"

function ErrorElement(props) {
  return <div className="Error">{props.value}</div>;
}

function UserSelector(props) {
  return (
    <button className="UserSelector" onClick={props.onClick}>
      {props.value}
    </button>
  );
}

class ImageView extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      error: null,
      image: null,
      isLoaded: false,
      name: null,
    };
  }

  componentDidUpdate(old_props) {
    if (old_props !== this.props) {
      let getData = async () => {
        let img_res = await fetch(`${api}/images/${this.props.value.image_id}`);
        let img = await img_res.blob();
        let name_res = await fetch(`${api}/images/${this.props.value.image_id}/name`);
        let name = await name_res.json();
        return [img, name]
      }
      getData()
        .then(([blob, name]) =>
          this.setState({ image: URL.createObjectURL(blob), isLoaded: true, name: name})
          , err => {
            this.setState({ isLoaded: false, error: err });
          }
        );
    }
  }

  componentDidMount() {
    this.componentDidUpdate(null);
  }

  render() {
    if (this.state.isLoaded)
      return (
        <div className="ImageView">
          <img className="Image" src={this.state.image} alt="synthetically generated line chart" />
          <div className="TrendLabel">{this.state.name}<br/><br/>Assigned Label: {this.props.value.label}</div>
        </div>
      )
    else if (this.state.error)
      return <ErrorElement value={this.state.error.message} />
    else
      return <div>Loading...</div>
  }

}

class UserView extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      error: null,
      assignments: null,
      image_idx: 0,
      image: null,
      isLoaded: false,
    };
  }

  label(l) {
    fetch(`${api}/users/${this.props.value.user_id}/images/${this.state.assignments[this.state.image_idx].image_id}/${l}`,
      {
        method: "POST",
      }
    ).then(_ => {
      this.setAssignments();
    })
  }


  handleKey(event) {
    if (event.srcElement.tagName !== "INPUT" && this.state.isLoaded && !event.repeat){
      if (event.key === "ArrowRight") {
        this.next()
      } else if (event.key === "ArrowLeft") {
        this.previous()
      }
      else if (event.key === "ArrowUp") {
        this.label("rising")
        this.next()
      } else if (event.key === "ArrowDown") {
        this.label("not-rising")
        this.next()
      }
    }
  }

  setAssignments() {
    fetch(`${api}/users/${this.props.value.user_id}/images`)
      .then(res => {
        if (res.status >= 400) {
          throw new Error("Something went wrong!");
        }
        return res.json();
      })
      .then(
        data => this.setState({ assignments: data, isLoaded: true }),
        err => {
          this.setState({ isLoaded: false, error: err });
        }
      );
  }

  nextUnlabeled() {
    let next = this.state.assignments.findIndex(a => a.label == null)
    if (next === -1) {
      return this.state.assignments.length - 1
    } else {
      return next
    }
  }

  componentDidMount() {
    this.setAssignments();
    document.addEventListener("keyup", (e) => this.handleKey(e), false);
  }

  next() {
    if (this.state.image_idx < (this.state.assignments.length - 1)) {
      this.setState({ image_idx: this.state.image_idx + 1 })
    }
  }

  componentDidUpdate() {
    document.getElementById("jumpToPageNumber").value = "";
  }

  componentWillUnmount() {
    document.removeEventListener("keyup", this.handleKey, false);
  }

  previous() {
    if (this.state.image_idx > 0) {
      this.setState({ image_idx: this.state.image_idx - 1 })
    }
  }

  goToPage(e) {
    e.preventDefault();
    let n = document.getElementById("jumpToPageNumber").value;
    this.setState({ image_idx: n - 1 });
  }

  render() {
    if (this.state.isLoaded)
      return (
        <div className="UserView">
          <nav>
            <h3 className="navHeader">{this.props.value.name}</h3>
            <div className="navCount">
            <form onSubmit={(e) => this.goToPage(e)}>
              <input id="jumpToPageNumber" type="number" placeholder={this.state.image_idx + 1} min="1" max={this.state.assignments.length} required />/{this.state.assignments.length}
            </form>
            </div>
            <div className="navButtons">
              <button onClick={() => this.setState({ image_idx: 0 })}>
                Jump to Start
              </button>
              <button onClick={() => this.setState({ image_idx: this.nextUnlabeled() })}>
                Jump to Next Unlabeled Image
              </button>
            </div>
          </nav>
          <ImageView value={{
            image_id: this.state.assignments[this.state.image_idx].image_id,
            label: this.state.assignments[this.state.image_idx].label || "unlabeled"
          }} />
          <div className="Info">
            Press ⬆️ to mark as rising and go to the next image<br />
            Press ⬇️ to mark as not-rising and go to the next image<br />
            Press ➡️ to go to next image<br />
            Press ⬅️ to go to previous image<br/>
          </div>
        </div>
      );
    else if (this.state.error) {
      return <ErrorElement value={this.state.error.message} />
    }
    else
      return (<div>Loading...</div>);

  }
}


class App extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      user: null,
      users: null,
      isLoaded: false,
      error: null,
    };
  }

  componentDidMount() {
    fetch(`${api}/users/`)
      .then(res => {
        if (res.status >= 400) {
          throw new Error("Something went wrong!");
        }
        return res.json()
      })
      .then(
        data => this.setState({ users: data, isLoaded: true }),
        err => this.setState({ error: err, isLoaded: false })
      );
  }

  handleUserSelection(user) {
    this.setState({ user: user })
  }

  render() {
    let body;
    if (this.state.error)
      body = <ErrorElement value={this.state.error.message} />;
    else if (!this.state.isLoaded)
      body = <div>Loading...</div>;
    else if (this.state.user)
      body = <UserView value={this.state.user} />;
    else {
      let userSelectors = this.state.users.map(user =>
        <UserSelector key={user.user_id} value={user.name} onClick={() => this.handleUserSelection(user)} />
      );
      body = (
        <div className="Selection">
          <h1>Select User</h1>
          {userSelectors}
        </div>
      );
    }
    return (
      <div className="App">
        {body}
      </div>
    );

  }
}

export default App;
