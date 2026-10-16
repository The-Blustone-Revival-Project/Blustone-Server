export const castFish={id:"LOCAL_AUTHORED_FISH",name:"Local authored fish",desc:"No original identity claim",thumbnail_id:"",effect:"",rank:1,use_type:17,sell_price:0,collect_qty:0};
export function castOptions(on_win:"keep"|"sell"="keep") {
  return {
    baitShopMode:"archive-2018-projection" as const,baitShopDailyLimit:3,
    fishingItems:[{...castFish}],
    fishingCatalogue:{pools:[{lure_id:"LU003",fish_id:castFish.id}],prices:[{fish_id:castFish.id,b_price:11,s_price:22,g_price:33}]},
    fishingSaleMode:"local-bound" as const,fishingSaleBindings:{},
    fishingCastMode:"local-configured" as const,
    fishingCastPolicy:{origin:"local-authored",bait_debit:"end-all",bait_qty:2,stock:"new-stack-per-catch",on_win,
      contexts:[{place_id:"LOCAL_PLACE",cast_dist:2,lure_id:"LU003",
        tuning:{init_val:20,max_val:100,dec_val:2,inc_val:5,dec_val_on_burn:4,
          first_burn:{min:3,max:5},burn_cool:{min:2,max:4},burn_dur:{min:1,max:2},wait_time:{min:1,max:3}},
        outcomes:[{fish_id:castFish.id,grade:1,length:100},{fish_id:castFish.id,grade:3,length:100},
          {fish_id:castFish.id,grade:2,length:120}]}]},
  };
}
export const castContext={place_id:"LOCAL_PLACE",cast_dist:"2",lure_id:"LU003"};
