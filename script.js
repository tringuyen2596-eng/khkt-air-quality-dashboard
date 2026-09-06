// ======================================================
// CẤU HÌNH
// ======================================================


// URL GOOGLE APPS SCRIPT

const SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbw5JwJ9Kil9T9ul12UqJ8mXen4l0Exdq4HJaHDK7ZEKdRYy58cBoyEBd9-ynVZo1somoA/exec";


// URL GOOGLE SHEETS DẠNG CSV

const SHEET_URL =
    "https://docs.google.com/spreadsheets/d/1Y_1yX00pbMFD416BXNSe2ClxGGGUK2kdps93Pz7Agh4/export?format=csv&gid=0";


// ======================================================
// BIẾN LƯU BIỂU ĐỒ
// ======================================================


let co2Chart = null;

let pm25Chart = null;

let peopleChart = null;


// ======================================================
// HÀM CHUYỂN DỮ LIỆU SANG SỐ
// ======================================================


function toNumber(value) {

    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {

        return 0;

    }


    return Number(

        String(value)
            .replace(",", ".")
            .trim()

    );

}


// ======================================================
// HÀM ĐỌC CSV
// ======================================================


function parseCSV(csvText) {

    const lines =
        csvText
            .trim()
            .split(/\r?\n/);


    if (lines.length < 2) {

        return [];

    }


    // ----------------------------------------------
    // ĐỌC HEADER
    // ----------------------------------------------

    const headers =
        lines[0]
            .split(",")
            .map(
                header =>
                    header
                        .trim()
                        .replace(/"/g, "")
            );


    // ----------------------------------------------
    // TẠO MẢNG DỮ LIỆU
    // ----------------------------------------------

    const data = [];


    for (
        let i = 1;
        i < lines.length;
        i++
    ) {

        const values =
            parseCSVLine(
                lines[i]
            );


        if (
            values.length === 0
        ) {

            continue;

        }


        const row = {};


        headers.forEach(

            (
                header,
                index
            ) => {

                row[header] =
                    values[index] !== undefined
                        ? values[index]
                        : "";

            }

        );


        data.push(row);

    }


    return data;

}


// ======================================================
// HÀM ĐỌC MỘT DÒNG CSV
//
// HỖ TRỢ DỮ LIỆU CÓ DẤU PHẨY
// ======================================================


function parseCSVLine(line) {

    const result = [];

    let current = "";

    let insideQuotes = false;


    for (
        let i = 0;
        i < line.length;
        i++
    ) {

        const character =
            line[i];


        if (
            character === '"'
        ) {

            insideQuotes =
                !insideQuotes;

        }


        else if (

            character === "," &&

            !insideQuotes

        ) {

            result.push(

                current
                    .trim()
                    .replace(/"/g, "")

            );


            current = "";

        }


        else {

            current += character;

        }

    }


    result.push(

        current
            .trim()
            .replace(/"/g, "")

    );


    return result;

}


// ======================================================
// HÀM TÌM GIÁ TRỊ THEO NHIỀU TÊN CỘT
// ======================================================


function getValue(

    row,
    possibleNames

) {

    for (

        const name
        of possibleNames

    ) {

        if (

            row[name] !== undefined &&

            row[name] !== ""

        ) {

            return row[name];

        }

    }


    return "";

}


// ======================================================
// TẢI DỮ LIỆU GOOGLE SHEETS
// ======================================================


async function loadData() {

    try {

        console.log(

            "Đang tải dữ liệu..."

        );


        const response =
            await fetch(

                SHEET_URL +
                "&t=" +
                Date.now()

            );


        if (

            !response.ok

        ) {

            throw new Error(

                "Không thể tải Google Sheets"

            );

        }


        const csvText =
            await response.text();


        const rawData =
            parseCSV(csvText);


        console.log(

            "Số dòng dữ liệu:",

            rawData.length

        );


        // ----------------------------------------------
        // XÓA DÒNG TEST
        // ----------------------------------------------

        const cleanData =
            rawData.filter(

                row => {

                    const co2Value =
                        getValue(

                            row,

                            [
                                "CO2",
                                "co2"
                            ]

                        );


                    return (

                        String(co2Value)
                            .toUpperCase()

                        !==

                        "TEST"

                    );

                }

            );


        if (

            cleanData.length === 0

        ) {

            throw new Error(

                "Không có dữ liệu hợp lệ"

            );

        }


        // ----------------------------------------------
        // LẤY DÒNG MỚI NHẤT
        // ----------------------------------------------

        const latest =
            cleanData[
                cleanData.length - 1
            ];


        // ----------------------------------------------
        // LẤY THỜI GIAN
        // ----------------------------------------------

        const time =
            getValue(

                latest,

                [
                    "Thoi_gian",
                    "Thời_gian",
                    "Timestamp"
                ]

            );


        // ----------------------------------------------
        // LẤY NHIỆT ĐỘ
        // ----------------------------------------------

        const temperature =
            toNumber(

                getValue(

                    latest,

                    [
                        "Nhiet_do",
                        "Nhiệt_độ",
                        "nhiet_do"
                    ]

                )

            );


        // ----------------------------------------------
        // LẤY ĐỘ ẨM
        // ----------------------------------------------

        const humidity =
            toNumber(

                getValue(

                    latest,

                    [
                        "Do_am",
                        "Độ_ẩm",
                        "do_am"
                    ]

                )

            );


        // ----------------------------------------------
        // LẤY CO2
        // ----------------------------------------------

        const co2 =
            toNumber(

                getValue(

                    latest,

                    [
                        "CO2",
                        "co2"
                    ]

                )

            );


        // ----------------------------------------------
        // LẤY PM2.5
        // ----------------------------------------------

        const pm25 =
            toNumber(

                getValue(

                    latest,

                    [
                        "PM2.5",
                        "PM25",
                        "pm25",
                        "PM2_5"
                    ]

                )

            );


        // ----------------------------------------------
        // LẤY SỐ NGƯỜI
        // ----------------------------------------------

        const people =
            toNumber(

                getValue(

                    latest,

                    [
                        "So_nguoi",
                        "Số_người",
                        "so_nguoi"
                    ]

                )

            );


        // ----------------------------------------------
        // HIỂN THỊ DASHBOARD
        // ----------------------------------------------

        document
            .getElementById(
                "temperature"
            )
            .textContent =
                temperature.toFixed(1);


        document
            .getElementById(
                "humidity"
            )
            .textContent =
                humidity.toFixed(1);


        document
            .getElementById(
                "co2"
            )
            .textContent =
                Math.round(co2);


        document
            .getElementById(
                "pm25"
            )
            .textContent =
                pm25.toFixed(1);


        document
            .getElementById(
                "people"
            )
            .textContent =
                Math.round(people);


        document
            .getElementById(
                "peopleInput"
            )
            .value =
                Math.round(people);


        document
            .getElementById(
                "lastUpdate"
            )
            .textContent =
                time;


        // ----------------------------------------------
        // CẬP NHẬT TRẠNG THÁI KHÔNG KHÍ
        // ----------------------------------------------

        updateAirStatus(

            co2,

            pm25,

            people

        );


        // ----------------------------------------------
        // CẬP NHẬT BIỂU ĐỒ
        // ----------------------------------------------

        createCharts(

            cleanData

        );


    } catch (error) {

        console.error(

            error

        );


        document
            .getElementById(
                "lastUpdate"
            )
            .textContent =
                "Lỗi tải dữ liệu";


        document
            .getElementById(
                "airStatus"
            )
            .textContent =
                "❌ Không thể tải dữ liệu";


    }

}


// ======================================================
// ĐÁNH GIÁ CHẤT LƯỢNG KHÔNG KHÍ
// ======================================================


function updateAirStatus(

    co2,

    pm25,

    people

) {

    const statusElement =
        document.getElementById(
            "airStatus"
        );


    let status = "";



    // ----------------------------------------------
    // MỨC NGUY HIỂM
    // ----------------------------------------------

    if (

        co2 >= 1000 ||

        pm25 >= 12

    ) {

        status =
            "🔴 CẢNH BÁO: Chất lượng không khí cần được chú ý!";


    }


    // ----------------------------------------------
    // MỨC CẦN CHÚ Ý
    // ----------------------------------------------

    else if (

        co2 >= 800

    ) {

        status =
            "🟡 CẦN CHÚ Ý: Nồng độ CO₂ đang tăng.";


    }


    // ----------------------------------------------
    // PHÒNG ĐÔNG NGƯỜI
    // ----------------------------------------------

    else if (

        people >= 20

    ) {

        status =
            "🟠 PHÒNG ĐÔNG NGƯỜI: Cần theo dõi chất lượng không khí.";


    }


    // ----------------------------------------------
    // BÌNH THƯỜNG
    // ----------------------------------------------

    else {

        status =
            "🟢 CHẤT LƯỢNG KHÔNG KHÍ BÌNH THƯỜNG";

    }


    statusElement.textContent =
        status;

}


// ======================================================
// CHUẨN BỊ DỮ LIỆU BIỂU ĐỒ
// ======================================================


function prepareChartData(

    data

) {

    // Chỉ lấy tối đa 200 mẫu mới nhất

    let chartData =
        data.slice(-200);


    const labels = [];

    const co2Data = [];

    const pm25Data = [];

    const peopleData = [];


    chartData.forEach(

        row => {


            // ------------------------------------------
            // THỜI GIAN
            // ------------------------------------------

            const time =
                getValue(

                    row,

                    [
                        "Thoi_gian",
                        "Thời_gian",
                        "Timestamp"
                    ]

                );


            // ------------------------------------------
            // CO2
            // ------------------------------------------

            const co2 =
                toNumber(

                    getValue(

                        row,

                        [
                            "CO2",
                            "co2"
                        ]

                    )

                );


            // ------------------------------------------
            // PM2.5
            // ------------------------------------------

            const pm25 =
                toNumber(

                    getValue(

                        row,

                        [
                            "PM2.5",
                            "PM25",
                            "pm25",
                            "PM2_5"
                        ]

                    )

                );


            // ------------------------------------------
            // SỐ NGƯỜI
            // ------------------------------------------

            const people =
                toNumber(

                    getValue(

                        row,

                        [
                            "So_nguoi",
                            "Số_người",
                            "so_nguoi"
                        ]

                    )

                );


            // ------------------------------------------
            // THÊM DỮ LIỆU
            // ------------------------------------------

            labels.push(

                time

            );


            co2Data.push(

                co2

            );


            pm25Data.push(

                pm25

            );


            peopleData.push(

                people

            );


        }

    );


    return {

        labels:

            labels,


        co2:

            co2Data,


        pm25:

            pm25Data,


        people:

            peopleData

    };

}


// ======================================================
// TẠO BIỂU ĐỒ
// ======================================================


function createCharts(

    rawData

) {

    const data =
        prepareChartData(

            rawData

        );


    // ----------------------------------------------
    // XÓA BIỂU ĐỒ CŨ
    // ----------------------------------------------

    if (

        co2Chart

    ) {

        co2Chart.destroy();

    }


    if (

        pm25Chart

    ) {

        pm25Chart.destroy();

    }


    if (

        peopleChart

    ) {

        peopleChart.destroy();

    }


    // ==================================================
    // BIỂU ĐỒ CO2
    // ==================================================

    const co2Canvas =
        document.getElementById(
            "co2Chart"
        );


    if (

        co2Canvas

    ) {

        co2Chart =
            new Chart(

                co2Canvas,

                {

                    type:

                        "line",


                    data:

                        {

                            labels:

                                data.labels,


                            datasets:

                                [

                                    {

                                        label:

                                            "CO₂ (ppm)",


                                        data:

                                            data.co2,


                                        borderWidth:

                                            2,


                                        tension:

                                            0.3,


                                        pointRadius:

                                            2


                                    },


                                    {

                                        label:

                                            "Ngưỡng chú ý (800 ppm)",


                                        data:

                                            data.labels.map(

                                                () => 800

                                            ),


                                        borderDash:

                                            [5, 5],


                                        borderWidth:

                                            1,


                                        pointRadius:

                                            0


                                    },


                                    {

                                        label:

                                            "Ngưỡng cảnh báo (1000 ppm)",


                                        data:

                                            data.labels.map(

                                                () => 1000

                                            ),


                                        borderDash:

                                            [5, 5],


                                        borderWidth:

                                            1,


                                        pointRadius:

                                            0


                                    }

                                ]

                        },


                    options:

                        {

                            responsive:

                                true,


                            maintainAspectRatio:

                                false,


                            interaction:

                                {

                                    mode:

                                        "index",


                                    intersect:

                                        false

                                },


                            scales:

                                {

                                    x:

                                        {

                                            ticks:

                                                {

                                                    maxTicksLimit:

                                                        10

                                                }

                                        },


                                    y:

                                        {

                                            beginAtZero:

                                                false,


                                            title:

                                                {

                                                    display:

                                                        true,


                                                    text:

                                                        "ppm"

                                                }

                                        }

                                }

                        }

                }

            );

    }


    // ==================================================
    // BIỂU ĐỒ PM2.5
    // ==================================================

    const pm25Canvas =
        document.getElementById(
            "pm25Chart"
        );


    if (

        pm25Canvas

    ) {

        pm25Chart =
            new Chart(

                pm25Canvas,

                {

                    type:

                        "line",


                    data:

                        {

                            labels:

                                data.labels,


                            datasets:

                                [

                                    {

                                        label:

                                            "PM2.5 (µg/m³)",


                                        data:

                                            data.pm25,


                                        borderWidth:

                                            2,


                                        tension:

                                            0.3,


                                        pointRadius:

                                            2

                                    },


                                    {

                                        label:

                                            "Ngưỡng cảnh báo (12 µg/m³)",


                                        data:

                                            data.labels.map(

                                                () => 12

                                            ),


                                        borderDash:

                                            [5, 5],


                                        borderWidth:

                                            1,


                                        pointRadius:

                                            0

                                    }

                                ]

                        },


                    options:

                        {

                            responsive:

                                true,


                            maintainAspectRatio:

                                false,


                            interaction:

                                {

                                    mode:

                                        "index",


                                    intersect:

                                        false

                                },


                            scales:

                                {

                                    x:

                                        {

                                            ticks:

                                                {

                                                    maxTicksLimit:

                                                        10

                                                }

                                        },


                                    y:

                                        {

                                            beginAtZero:

                                                true,


                                            title:

                                                {

                                                    display:

                                                        true,


                                                    text:

                                                        "µg/m³"

                                                }

                                        }

                                }

                        }

                }

            );

    }


    // ==================================================
    // BIỂU ĐỒ SỐ NGƯỜI
    // ==================================================

    const peopleCanvas =
        document.getElementById(
            "peopleChart"
        );


    if (

        peopleCanvas

    ) {

        peopleChart =
            new Chart(

                peopleCanvas,

                {

                    type:

                        "line",


                    data:

                        {

                            labels:

                                data.labels,


                            datasets:

                                [

                                    {

                                        label:

                                            "Số người",


                                        data:

                                            data.people,


                                        borderWidth:

                                            2,


                                        tension:

                                            0.2,


                                        pointRadius:

                                            2

                                    },


                                    {

                                        label:

                                            "Ngưỡng đông người (20 người)",


                                        data:

                                            data.labels.map(

                                                () => 20

                                            ),


                                        borderDash:

                                            [5, 5],


                                        borderWidth:

                                            1,


                                        pointRadius:

                                            0

                                    }

                                ]

                        },


                    options:

                        {

                            responsive:

                                true,


                            maintainAspectRatio:

                                false,


                            interaction:

                                {

                                    mode:

                                        "index",


                                    intersect:

                                        false

                                },


                            scales:

                                {

                                    x:

                                        {

                                            ticks:

                                                {

                                                    maxTicksLimit:

                                                        10

                                                }

                                        },


                                    y:

                                        {

                                            beginAtZero:

                                                true,


                                            title:

                                                {

                                                    display:

                                                        true,


                                                    text:

                                                        "Người"

                                                }

                                        }

                                }

                        }

                }

            );

    }

}


// ======================================================
// CẬP NHẬT SỐ NGƯỜI
// ======================================================


async function updatePeople() {

    const input =
        document.getElementById(
            "peopleInput"
        );


    const people =
        Number(

            input.value

        );


    if (

        people < 0 ||

        !Number.isFinite(people)

    ) {

        alert(

            "Số người không hợp lệ!"

        );

        return;

    }


    try {

        const response =
            await fetch(

                SCRIPT_URL,

                {

                    method:

                        "POST",


                    headers:

                        {

                            "Content-Type":

                                "text/plain;charset=utf-8"

                        },


                    body:

                        JSON.stringify(

                            {

                                action:

                                    "set_people",


                                so_nguoi:

                                    Math.round(

                                        people

                                    )

                            }

                        )

                }

            );


        const result =
            await response.text();


        console.log(

            "Phản hồi:",

            result

        );


        alert(

            "✅ Đã gửi lệnh cập nhật số người: " +

            Math.round(people)

        );


        document
            .getElementById(
                "people"
            )
            .textContent =
                Math.round(people);


    } catch (error) {

        console.error(error);


        alert(

            "❌ Không thể gửi lệnh cập nhật số người!"

        );

    }

}


// ======================================================
// BIẾN LƯU TRẠNG THÁI LED
// ======================================================


let currentLedMode =
    "AUTO";


let ledState = {

    red:

        "OFF",


    yellow:

        "OFF",


    green:

        "OFF"

};


// ======================================================
// ĐẶT CHẾ ĐỘ LED
// ======================================================


function setLedMode(

    mode

) {

    currentLedMode =
        mode;


    sendLedCommand();

}


// ======================================================
// ĐIỀU KHIỂN LED
// ======================================================


function setLed(

    color,

    state

) {

    // Chuyển sang MANUAL

    currentLedMode =
        "MANUAL";


    // Cập nhật LED được chọn

    ledState[color] =
        state;


    sendLedCommand();

}


// ======================================================
// GỬI LỆNH LED
// ======================================================


async function sendLedCommand() {

    try {

        const data = {

            action:

                "set_led",


            mode:

                currentLedMode,


            red:

                ledState.red,


            yellow:

                ledState.yellow,


            green:

                ledState.green

        };


        const response =
            await fetch(

                SCRIPT_URL,

                {

                    method:

                        "POST",


                    headers:

                        {

                            "Content-Type":

                                "text/plain;charset=utf-8"

                        },


                    body:

                        JSON.stringify(

                            data

                        )

                }

            );


        const result =
            await response.text();


        console.log(

            "LED response:",

            result

        );


        alert(

            "💡 Đã cập nhật điều khiển LED!"

        );


    } catch (error) {

        console.error(

            error

        );


        alert(

            "❌ Không thể gửi lệnh điều khiển LED!"

        );

    }

}


// ======================================================
// KHỞI ĐỘNG DASHBOARD
// ======================================================


document.addEventListener(

    "DOMContentLoaded",

    function () {


        // Tải dữ liệu lần đầu

        loadData();


        // Tự động cập nhật mỗi 30 giây

        setInterval(

            loadData,

            30000

        );


    }

);
