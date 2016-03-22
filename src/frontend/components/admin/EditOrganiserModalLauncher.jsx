'use strict';

import React, {Component} from 'react';
import {render} from 'react-dom';

import EditOrganiserForm from './EditOrganiserForm.jsx';
import Modal from 'react-modal';

export default class EditOrganiserModalLauncher extends Component {
    constructor(props) {
        super(props);
        this.state = {modalIsOpen: false};
    }

    launchEditForm () {
        this.setState({modalIsOpen: true});
    }

    closeEditForm () {
        this.setState({modalIsOpen: false});
    }

    render() {

        let customStyle = {

            content:{
                bottom: 'none'
            }

        };
        return (
            <div>
                <button className="edit" onClick={this.launchEditForm.bind(this)}><span>Edit organiser</span></button>
                <Modal
                    isOpen={this.state.modalIsOpen}
                    onRequestClose={this.closeEditForm.bind(this)} style={customStyle}>
                    <EditOrganiserForm
                        organiser={this.props.organiser}
                        onSave={this.props.onSave}
                        onSuccess={this.closeEditForm.bind(this)}/>
                </Modal>
            </div>
        )
    }
}
