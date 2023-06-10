import { WheelPicker } from "./src/WheelPicker"

let frutis = "西瓜,柠檬,草莓,荔枝,橘子,菠萝,香蕉,柚子,苹果,龙眼".split(",")
let frutisEn = "watermelon,lemon,strawberry,litchi,orange,pineapple,banana,grapefruit,apple,longan".split(",")
let frutiData = frutis.map(function (name, idx) {
    return {
        text: name,
        value: frutisEn[idx]
    }
})
let vegetables = "香菜,青菜,芦笋,萝卜,水芹,黄瓜,冬瓜,番茄,茄子,土豆".split(",")
let vegetablesEn = "parsley,celery,asparagus,carrot,celery,cucumber,melon,tomato,eggplant,potato".split(",")
let vegetableData = vegetables.map(function (name, idx) {
    return {
        text: name,
        value: vegetablesEn[idx]
    }
})

let picker1 = new WheelPicker({
    title: "单列选择器",
    data: [frutis],
    onSelect: selected => {
        alert(selected[0].value)
    }
})

document.getElementById("demo1").onclick = function () {
    picker1.show()
    return false
}

let picker2 = new WheelPicker({
    el: "#demo2",
    data: [frutiData, vegetableData],
    value: ["lemon", "carrot"]
})

fetch("https://cdn.jsdelivr.net/gh/modood/Administrative-divisions-of-China/dist/pca.json")
    .then(function (response) {
        return response.json()
    })
    .then(function (data) {
        let defaultProv = Object.keys(data)[0]

        let picker3 = new WheelPicker({
            el: "#demo3",
            hideOnBackdrop: true,
            hiddenInput: true,
            data: [
                Object.keys(data),
                Object.keys(data[defaultProv]),
                data[defaultProv][Object.keys(data[defaultProv])[0]]
            ],
            onChange: function (this: WheelPicker, index, selected) {
                console.log("onChange", index, selected)

                if (index === 0) {
                    let cityObj = data[selected.value]
                    let cities = cityObj ? Object.keys(cityObj) : []
                    this.setData(cities, 1)
                    this.setData(cities.length ? cityObj[cities[0]] : [], 2)
                } else if (index === 1) {
                    let prov = this.getSelectedItems()[0]
                    this.setData(data[prov.value][selected.value], 2)
                }
            },
            onSelect: function (selected) {
                console.log("onSelect", selected)
            },
            onShow: function () {
                console.log("onShow")
            },
            onCancel: function () {
                console.log("onCancel")
            },
            formatValue: function (value) {
                return value.join(" ")
            }
        })
    })

