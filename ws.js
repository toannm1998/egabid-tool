const mqtt = require('mqtt');

const connectWs = () => {
    // Tăng giới hạn MaxListeners cho tất cả các instance của MqttClient
    mqtt.MqttClient.prototype.setMaxListeners(20);

    const client = mqtt.connect('wss://emqx-wss.hyraholdings.net/mqtt', {
        clientId: 'mqttjs_' + Math.random().toString(16).substr(2, 8)
    });
    
    client.on('connect', function () {
        console.log('Connected to MQTT broker');
        // Đăng ký nhận tin nhắn từ topic "test/topic"
        client.subscribe(`egabid-auction/status`, function (err) {
            if (!err) {
                console.log('Subscribed to all topics status');
            }
        });
    });
    
    // Khi ngắt kết nối
    client.on('close', function () {
        console.log('Disconnected from MQTT broker');
    });

    // Thêm phương thức để hủy đăng ký và xóa listeners
    client.cleanup = function() {
        this.unsubscribe(`egabid-auction/status`);
        this.removeAllListeners('message');
        this.removeAllListeners('connect');
        this.removeAllListeners('close');
    };

    return client;
}

module.exports = connectWs;
